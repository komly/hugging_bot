import { Context } from 'telegraf';
import { databaseService } from './database';

export class PaymentService {
  async handlePreCheckoutQuery(ctx: Context): Promise<void> {
    if (!ctx.preCheckoutQuery) return;

    try {
      // Validate the payment
      const paymentId = ctx.preCheckoutQuery.invoice_payload;
      
      // You can add additional validation here
      // For now, we'll approve all payments
      
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error('Error in pre-checkout query:', error);
      await ctx.answerPreCheckoutQuery(false, 'Ошибка при обработке платежа');
    }
  }

  async handleSuccessfulPayment(ctx: Context): Promise<void> {
    if (!ctx.message || !('successful_payment' in ctx.message) || !ctx.from) return;

    try {
      const payment = ctx.message.successful_payment;
      const paymentId = payment.invoice_payload;
      const telegramPaymentId = payment.telegram_payment_charge_id;

      // Complete the payment in database
      await databaseService.completePayment(paymentId, telegramPaymentId);

      // Get user stats to show updated info
      const user = await databaseService.findOrCreateUser(ctx.from.id.toString(), {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });

      const stats = await databaseService.getUserStats(user.id);

      const successMessage = `
✅ *Платеж успешно обработан!*

💎 Генерации добавлены на ваш счет
📊 Доступно генераций: ${stats.totalAllowed - stats.generationsUsed}

Теперь вы можете создавать больше романтических видео! 
Используйте /generate чтобы начать 🎬✨
      `;

      await ctx.reply(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎬 Создать видео', callback_data: 'generate_new' }
          ]]
        }
      });

    } catch (error) {
      console.error('Error handling successful payment:', error);
      await ctx.reply('❌ Ошибка при обработке платежа. Обратитесь в поддержку.');
    }
  }
}

export const paymentService = new PaymentService();
