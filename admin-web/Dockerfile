FROM node:18-alpine

# Create working directory
RUN mkdir -p /app
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["pnpm", "start"]