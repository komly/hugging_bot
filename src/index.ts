import dotenv from 'dotenv';
import { TelegramBot } from './bot/bot';
import { databaseService } from './services/database';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting Romantic Video Bot...');
    console.log('🔧 TELEGRAM_BOT_TOKEN loaded:', process.env.TELEGRAM_BOT_TOKEN ? 'Yes' : 'No');

    // Validate required environment variables
    const requiredEnvVars = [
      'TELEGRAM_BOT_TOKEN',
      'OPENAI_API_KEY',
      'REPLICATE_API_TOKEN',
      'DATABASE_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
      process.exit(1);
    }

    console.log('✅ Environment variables validated');

    // Test database connection
    try {
      await databaseService.findOrCreateUser('test', {});
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.log('Make sure PostgreSQL is running and DATABASE_URL is correct');
      process.exit(1);
    }

    // Create and start the bot
    const telegramBot = new TelegramBot();
    telegramBot.start();

    console.log('🎉 Romantic Video Bot is running!');
    console.log('📱 Send /start to your bot to begin');

  } catch (error) {
    console.error('❌ Failed to start the bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await databaseService.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
