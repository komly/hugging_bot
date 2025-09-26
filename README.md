# 🌹 Romantic Video Bot

Telegram бот, который создает романтические видео из двух фотографий с помощью AI.

## 🚀 Возможности

- 📸 Загрузка двух фотографий
- 🎨 Создание романтической сцены с помощью GPT-4 Vision и DALL-E 3
- 🎬 Генерация романтического видео с помощью Replicate AI
- 💎 Система оплаты через Telegram Stars
- 🔒 Безопасное хранение файлов в MinIO
- 📊 Отслеживание использования и статистики

## 🛠 Технологии

- **Backend**: TypeScript, Node.js
- **Bot Framework**: Telegraf
- **Database**: PostgreSQL + Prisma ORM
- **File Storage**: MinIO
- **AI Services**: 
  - OpenAI GPT-4 Vision (анализ фото)
  - OpenAI DALL-E 3 (генерация изображений)
  - Replicate (генерация видео)
- **Payment**: Telegram Stars
- **Deployment**: Docker, Docker Compose

## 📋 Требования

- Node.js 18+
- pnpm
- PostgreSQL
- MinIO
- Docker (опционально)

## 🔧 Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd hugging_bot
```

### 2. Установка зависимостей

```bash
pnpm install
```

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните необходимые значения:

```bash
cp .env.example .env
```

Заполните следующие переменные:

```env
# Telegram Bot Token (получить у @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Replicate API Token
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Database URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/romantic_bot_db

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=romantic-bot-files
MINIO_USE_SSL=false
```

### 4. Настройка базы данных

Создайте базу данных PostgreSQL:

```bash
createdb romantic_bot_db
```

Примените миграции Prisma:

```bash
pnpm db:push
pnpm db:generate
```

### 5. Запуск в режиме разработки

```bash
pnpm dev
```

## 🐳 Запуск с Docker

### 1. Настройка переменных окружения

Создайте файл `.env` с токенами:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

### 2. Запуск всех сервисов

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL на порту 5432
- MinIO на портах 9000 (API) и 9001 (Console)
- Romantic Bot на порту 3000

### 3. Применение миграций

После первого запуска выполните миграции:

```bash
docker-compose exec romantic-bot pnpm db:push
```

## 📱 Использование бота

1. Найдите вашего бота в Telegram
2. Отправьте `/start` для получения инструкций
3. Используйте `/generate` для создания видео
4. Загрузите два фото
5. Дождитесь обработки
6. Получите готовое романтическое видео!

## 🔧 Команды бота

- `/start` - Приветствие и инструкции
- `/generate` - Начать создание видео
- `/stats` - Посмотреть статистику использования
- `/buy` - Купить дополнительные генерации
- `/reset` - Сбросить текущую генерацию
- `/help` - Помощь

## 💰 Система оплаты

Бот использует Telegram Stars для оплаты дополнительных генераций:

- 🆓 1 бесплатная генерация для каждого пользователя
- 🌟 1 генерация - 50 Stars
- 🌟 5 генераций - 225 Stars (скидка 10%)
- 🌟 10 генераций - 400 Stars (скидка 20%)
- 🌟 25 генераций - 875 Stars (скидка 30%)

## 🏗 Архитектура

```
src/
├── bot/
│   └── bot.ts              # Основная логика Telegram бота
├── services/
│   ├── database.ts         # Сервис работы с базой данных
│   ├── minio.ts           # Сервис работы с MinIO
│   ├── openai.ts          # Сервис работы с OpenAI
│   ├── replicate.ts       # Сервис работы с Replicate
│   └── payment.ts         # Сервис обработки платежей
└── index.ts               # Точка входа приложения
```

## 🔒 Безопасность

- Все API ключи хранятся в переменных окружения
- Файлы загружаются в приватное хранилище MinIO
- Используются presigned URLs для доступа к файлам
- Валидация всех входящих данных

## 📊 Мониторинг

Бот логирует все важные события:
- Создание пользователей
- Генерации видео
- Ошибки обработки
- Платежи

## 🚀 Деплой в продакшн

### Vercel/Railway/Render

1. Подключите репозиторий к платформе
2. Настройте переменные окружения
3. Настройте внешние сервисы (PostgreSQL, MinIO)
4. Деплойте приложение

### VPS/Dedicated Server

1. Установите Docker и Docker Compose
2. Клонируйте репозиторий
3. Настройте `.env` файл
4. Запустите: `docker-compose up -d`

## 🤝 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте логи: `docker-compose logs romantic-bot`
2. Убедитесь, что все сервисы запущены: `docker-compose ps`
3. Проверьте переменные окружения
4. Создайте issue в репозитории

## 📝 Лицензия

MIT License

## 🙏 Благодарности

- OpenAI за GPT-4 Vision и DALL-E 3
- Replicate за AI модели генерации видео
- Telegram за Bot API и Stars
- Сообщество разработчиков за открытые библиотеки
