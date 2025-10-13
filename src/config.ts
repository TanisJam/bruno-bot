import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config();

// Main application configuration interface
export interface AppConfig {
  // Discord Bot
  CLIENT_ID: string;
  TOKEN: string;
  GUILD_ID: string;

  // Database
  DB_PATH: string;
}

// Extract environment variables
const { CLIENT_ID, TOKEN, GUILD_ID, DB_PATH } = process.env;

// Validate required environment variables
const requiredEnvVars = ['CLIENT_ID', 'TOKEN', 'GUILD_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Application configuration
const config: AppConfig = {
  // Discord Bot
  CLIENT_ID: CLIENT_ID!,
  TOKEN: TOKEN!,
  GUILD_ID: GUILD_ID!,

  // Database (defaults to ./data/bruno-bot.db if not specified)
  DB_PATH: DB_PATH || join(process.cwd(), 'data', 'bruno-bot.db'),
};

export default config;
