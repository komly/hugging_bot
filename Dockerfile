# Use Node.js 18 image
FROM node:18

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

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
RUN groupadd -g 1001 botuser
RUN useradd -r -u 1001 -g botuser botuser

# Change ownership of the app directory
RUN chown -R botuser:botuser /app
USER botuser

# Start the Telegram bot
CMD ["pnpm", "start"]
