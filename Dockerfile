# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build the application
RUN pnpm build

# Create non-root user for bot
RUN addgroup -g 1001 -S botuser
RUN adduser -S botuser -u 1001

# Change ownership of the app directory
RUN chown -R botuser:botuser /app
USER botuser

# Start the Telegram bot
CMD ["pnpm", "start"]
