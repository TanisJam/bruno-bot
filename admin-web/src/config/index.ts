import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config();

// Main application configuration interface
export interface AppConfig {
  // Server
  NODE_ENV: string;
  PORT: number;

  // Database
  DB_PATH: string;

  // Authentication
  ADMIN_API_KEY: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  JWT_EXPIRES_IN: string;

  // CORS
  ALLOWED_ORIGINS: string[];

  // Timezone
  TIMEZONE: string;
}

// Extract environment variables
const { 
  NODE_ENV, 
  PORT, 
  DB_PATH, 
  ADMIN_API_KEY, 
  JWT_SECRET, 
  SESSION_SECRET, 
  JWT_EXPIRES_IN,
  ALLOWED_ORIGINS,
  TIMEZONE 
} = process.env;

// Validate required environment variables
const requiredEnvVars = ['ADMIN_API_KEY', 'JWT_SECRET', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Parse CORS origins
const allowedOrigins = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : ['http://localhost:3000'];

// Application configuration
const config: AppConfig = {
  // Server
  NODE_ENV: NODE_ENV || 'development',
  PORT: parseInt(PORT || '3000', 10),

  // Database (defaults to ./data/bruno-bot.db if not specified)
  DB_PATH: DB_PATH || join(process.cwd(), 'data', 'bruno-bot.db'),

  // Authentication
  ADMIN_API_KEY: ADMIN_API_KEY!,
  JWT_SECRET: JWT_SECRET!,
  SESSION_SECRET: SESSION_SECRET!,
  JWT_EXPIRES_IN: JWT_EXPIRES_IN || '24h',

  // CORS
  ALLOWED_ORIGINS: allowedOrigins,

  // Timezone (defaults to America/Argentina/Buenos_Aires - GMT-3)
  TIMEZONE: TIMEZONE || 'America/Argentina/Buenos_Aires',
};

export default config;