#!/bin/bash

# Script to initialize the database for Romantic Video Bot

set -e

echo "🚀 Initializing Romantic Video Bot Database..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL first"
    exit 1
fi

# Default database configuration
DB_NAME="romantic_bot_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📦 Creating database '$DB_NAME'..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo "✅ Database '$DB_NAME' created successfully"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your actual API keys and tokens"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm db:generate

# Push database schema
echo "🗄️  Pushing database schema..."
pnpm db:push

echo ""
echo "🎉 Database initialization completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys:"
echo "   - TELEGRAM_BOT_TOKEN (get from @BotFather)"
echo "   - OPENAI_API_KEY (get from OpenAI)"
echo "   - REPLICATE_API_TOKEN (get from Replicate)"
echo ""
echo "2. Start MinIO (if not using Docker):"
echo "   docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ':9001'"
echo ""
echo "3. Start the bot:"
echo "   pnpm dev"
echo ""
echo "4. Or use Docker Compose:"
echo "   docker-compose up -d"
echo ""
