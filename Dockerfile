# Multi-stage build for Bruno Bot
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files and build
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm for production
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bruno -u 1001

# Change ownership of app directory
RUN chown -R bruno:nodejs /app
USER bruno

# Command to run the application
CMD ["node", "dist/index.js"]
