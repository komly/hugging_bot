import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import axios from 'axios';
import { databaseService } from '../services/database';
import { minioService } from '../services/minio';
import { openaiService } from '../services/openai';
import { replicateService } from '../services/replicate';
import { paymentService } from '../services/payment';
import { GenerationStatus } from '@prisma/client';

interface BotContext extends Context {
  user?: {
    id: number;
    telegramId: string;
  };
}

export class TelegramBot {
  private bot: Telegraf<BotContext>;

  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN);
    this.setupMiddleware();
    this.setupCommands();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    // User middleware to find or create user
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        const user = await databaseService.findOrCreateUser(
          ctx.from.id.toString(),
          {
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
          }
        );
        ctx.user = {
          id: user.id,
          telegramId: user.telegramId,
        };
      }
      return next();
    });
  }

  private setupCommands(): void {
    // Start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `
🌹 *Добро пожаловать в Romantic Video Bot!* 🌹

Этот бот создает романтические видео из ваших фотографий! 

*Как это работает:*
1️⃣ Отправьте команду /generate
2️⃣ Загрузите 2 фотографии (себя и партнера)
3️⃣ Получите красивое романтическое видео!

*Лимиты:*
• 1 бесплатная генерация
• Дополнительные генерации за Telegram Stars ⭐

*Команды:*
/generate - Начать создание видео
/stats - Посмотреть статистику
/buy - Купить дополнительные генерации
/help - Помощь
/reset - Сбросить текущую генерацию

Готовы создать что-то волшебное? ✨
      `;

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      const helpMessage = `
*Помощь по использованию бота* 📖

*Основные команды:*
/start - Приветствие и инструкции
/generate - Начать создание романтического видео
/stats - Посмотреть количество использованных генераций
/buy - Купить дополнительные генерации за Stars
/reset - Отменить текущую генерацию

*Как создать видео:*
1. Используйте /generate
2. Отправьте первое фото
3. Отправьте второе фото
4. Дождитесь обработки (может занять несколько минут)
5. Получите готовое романтическое видео!

*Важно:*
• Фото должны быть четкими и хорошего качества
• На фото должны быть видны лица людей
• Бот создает семейно-дружелюбный контент

Нужна помощь? Напишите @support
      `;

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      if (!ctx.user) return;

      try {
        const stats = await databaseService.getUserStats(ctx.user.id);
        const statsMessage = `
📊 *Ваша статистика:*

🎬 Использовано генераций: ${stats.generationsUsed}/${stats.totalAllowed}
💎 Куплено генераций: ${stats.paidGenerations}
🆓 Осталось бесплатных: ${Math.max(0, 1 - stats.generationsUsed)}

${stats.generationsUsed >= stats.totalAllowed ? 
  '⚠️ Лимит исчерпан! Используйте /buy для покупки дополнительных генераций.' : 
  '✅ У вас есть доступные генерации!'}
        `;

        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка при получении статистики');
      }
    });

    // Generate command
    this.bot.command('generate', async (ctx) => {
      if (!ctx.user) return;

      try {
        // Check if user can generate
        const canGenerate = await databaseService.canUserGenerate(ctx.user.id);
        if (!canGenerate) {
          await ctx.reply(
            '❌ У вас закончились генерации! Используйте /buy для покупки дополнительных.',
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: '💎 Купить генерации', callback_data: 'buy_generations' }
                ]]
              }
            }
          );
          return;
        }

        // Check if user has active generation
        const activeGeneration = await databaseService.getActiveGeneration(ctx.user.id);
        if (activeGeneration) {
          await ctx.reply(
            '⚠️ У вас уже есть активная генерация. Используйте /reset чтобы начать заново или дождитесь завершения текущей.',
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🔄 Сбросить', callback_data: 'reset_generation' }
                ]]
              }
            }
          );
          return;
        }

        // Create new generation
        await databaseService.createGeneration(ctx.user.id);

        const generateMessage = `
🎬 *Начинаем создание романтического видео!*

📸 Отправьте *первое фото* (себя или партнера)

*Требования к фото:*
• Четкое изображение лица
• Хорошее освещение
• Формат: JPG, PNG
• Размер: до 20MB

После первого фото я попрошу второе! 📷✨
        `;

        await ctx.reply(generateMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error in generate command:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Reset command
    this.bot.command('reset', async (ctx) => {
      if (!ctx.user) return;

      try {
        const activeGeneration = await databaseService.getActiveGeneration(ctx.user.id);
        if (!activeGeneration) {
          await ctx.reply('❌ У вас нет активной генерации для сброса.');
          return;
        }

        await databaseService.updateGeneration(activeGeneration.id, {
          status: GenerationStatus.ERROR
        });

        await ctx.reply('✅ Генерация сброшена! Теперь вы можете начать новую с помощью /generate');
      } catch (error) {
        console.error('Error in reset command:', error);
        await ctx.reply('❌ Ошибка при сбросе генерации');
      }
    });

    // Buy command
    this.bot.command('buy', async (ctx) => {
      const buyMessage = `
💎 *Купить дополнительные генерации*

*Тарифы:*
🌟 1 генерация - 50 Stars
🌟 5 генераций - 225 Stars (скидка 10%)
🌟 10 генераций - 400 Stars (скидка 20%)
🌟 25 генераций - 875 Stars (скидка 30%)

Выберите пакет:
      `;

      await ctx.reply(buyMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌟 1 генерация (50 Stars)', callback_data: 'buy_1_50' }],
            [{ text: '🌟 5 генераций (225 Stars)', callback_data: 'buy_5_225' }],
            [{ text: '🌟 10 генераций (400 Stars)', callback_data: 'buy_10_400' }],
            [{ text: '🌟 25 генераций (875 Stars)', callback_data: 'buy_25_875' }],
          ]
        }
      });
    });
  }

  private setupHandlers(): void {
    // Photo handler
    this.bot.on(message('photo'), async (ctx) => {
      if (!ctx.user) return;

      try {
        const activeGeneration = await databaseService.getActiveGeneration(ctx.user.id);
        if (!activeGeneration) {
          await ctx.reply('❌ Сначала используйте команду /generate чтобы начать создание видео!');
          return;
        }

        if (activeGeneration.status !== GenerationStatus.WAITING_PHOTOS) {
          await ctx.reply('⏳ Ваша генерация уже обрабатывается. Пожалуйста, дождитесь завершения.');
          return;
        }

        // Get the largest photo
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        
        // Download photo from Telegram
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        const photoBuffer = Buffer.from(response.data);

        // Upload to MinIO
        const photoUrl = await minioService.uploadFile(
          photoBuffer,
          `photo_${Date.now()}.jpg`,
          'image/jpeg'
        );

        if (!activeGeneration.photo1Url) {
          // First photo
          await databaseService.updateGeneration(activeGeneration.id, {
            photo1Url: photoUrl
          });

          await ctx.reply(
            '✅ Первое фото получено!\n\n📸 Теперь отправьте *второе фото*',
            { parse_mode: 'Markdown' }
          );
        } else if (!activeGeneration.photo2Url) {
          // Second photo - start processing
          await databaseService.updateGeneration(activeGeneration.id, {
            photo2Url: photoUrl,
            status: GenerationStatus.PROCESSING_PHOTOS
          });

          await ctx.reply(
            '✅ Второе фото получено!\n\n🎨 Начинаю создание романтической сцены... Это может занять несколько минут.',
            { parse_mode: 'Markdown' }
          );

          // Start processing in background
          this.processGeneration(ctx.user.id, activeGeneration.id, ctx);
        } else {
          await ctx.reply('❌ Вы уже загрузили оба фото. Дождитесь завершения обработки или используйте /reset');
        }
      } catch (error) {
        console.error('Error handling photo:', error);
        await ctx.reply('❌ Ошибка при обработке фото. Попробуйте еще раз.');
      }
    });

    // Callback query handler for buttons
    this.bot.on('callback_query', async (ctx) => {
      if (!ctx.user || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

      const data = ctx.callbackQuery.data;

      try {
        if (data === 'reset_generation') {
          const activeGeneration = await databaseService.getActiveGeneration(ctx.user.id);
          if (activeGeneration) {
            await databaseService.updateGeneration(activeGeneration.id, {
              status: GenerationStatus.ERROR
            });
            await ctx.editMessageText('✅ Генерация сброшена! Используйте /generate для создания новой.');
          }
        } else if (data.startsWith('buy_')) {
          // Handle purchase
          const [, generations, stars] = data.split('_');
          await this.handlePurchase(ctx, parseInt(generations), parseInt(stars));
        }

        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery('Произошла ошибка');
      }
    });

    // Payment handlers
    this.bot.on('pre_checkout_query', async (ctx) => {
      await paymentService.handlePreCheckoutQuery(ctx);
    });

    this.bot.on(message('successful_payment'), async (ctx) => {
      await paymentService.handleSuccessfulPayment(ctx);
    });
  }

  private async processGeneration(userId: number, generationId: string, ctx: BotContext): Promise<void> {
    try {
      // Get generation data
      const generation = await databaseService.updateGeneration(generationId, {
        status: GenerationStatus.GENERATING_IMAGE
      });

      if (!generation.photo1Url || !generation.photo2Url) {
        throw new Error('Missing photo URLs');
      }

      // Generate romantic image directly
      await ctx.reply('🎨 Создаю романтическую сцену...');
      
      const romanticImageUrl = await openaiService.generateRomanticImage(
        generation.photo1Url,
        generation.photo2Url
      );

      await databaseService.updateGeneration(generationId, {
        romanticImageUrl,
        status: GenerationStatus.GENERATING_VIDEO
      });

      await ctx.reply('🎬 Создаю романтическое видео... Это займет несколько минут.');

      // Generate video
      const videoUrl = await replicateService.generateRomanticVideo(romanticImageUrl);

      // Complete generation
      await databaseService.updateGeneration(generationId, {
        videoUrl,
        status: GenerationStatus.COMPLETED
      });

      // Increment user generations
      await databaseService.incrementUserGenerations(userId);

      // Send result
      await ctx.reply('✨ Ваше романтическое видео готово! ✨');
      await ctx.replyWithVideo(videoUrl, {
        caption: '💕 Романтическое видео создано специально для вас!\n\nПонравилось? Поделитесь с друзьями! 🌹',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎬 Создать еще одно', callback_data: 'generate_new' },
            { text: '💎 Купить генерации', callback_data: 'buy_generations' }
          ]]
        }
      });

    } catch (error) {
      console.error('Error processing generation:', error);
      
      await databaseService.updateGeneration(generationId, {
        status: GenerationStatus.ERROR
      });

      await ctx.reply(
        '❌ Произошла ошибка при создании видео. Попробуйте еще раз с помощью /generate\n\nЕсли проблема повторяется, обратитесь в поддержку.'
      );
    }
  }

  private async handlePurchase(ctx: BotContext, generations: number, stars: number): Promise<void> {
    if (!ctx.user) return;

    try {
      // Create payment record
      const paymentId = await databaseService.createPayment(ctx.user.id, stars, generations);

      // Send invoice
      await ctx.replyWithInvoice({
        title: `${generations} генераций видео`,
        description: `Покупка ${generations} дополнительных генераций романтических видео`,
        payload: paymentId,
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR', // Telegram Stars currency
        prices: [{ label: `${generations} генераций`, amount: stars }],
      });

    } catch (error) {
      console.error('Error handling purchase:', error);
      await ctx.reply('❌ Ошибка при создании платежа. Попробуйте позже.');
    }
  }

  public start(): void {
    this.bot.launch();
    console.log('🤖 Telegram bot started successfully!');

    // Graceful shutdown
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

// Export only the class, instance will be created in main()
