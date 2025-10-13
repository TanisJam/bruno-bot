# Multi-stage build for Bruno Bot
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml .npmrc ./

# Install dependencies with build scripts allowed (needed for better-sqlite3)
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

# Copy source files and build
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine

# Install build dependencies for native modules (needed for better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install pnpm for production
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml /app/.npmrc ./

# Install only production dependencies with build scripts allowed
RUN pnpm install --frozen-lockfile --prod --dangerously-allow-all-builds

# Copy built application
COPY --from=builder /app/dist ./dist

# Create data directory for database
RUN mkdir -p /app/data

# Command to run the application
CMD ["node", "dist/index.js"]
