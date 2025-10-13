/**
 * Entry point for the Nivel20 Character Bot
 */

import { mkdirSync } from 'fs';
import { dirname } from 'path';
import config from './config';
import { DatabaseService } from './services/database.service';
import { logger } from './utils/logger';

logger.info('🚀 Starting Nivel20 Character Bot...');

// Ensure database directory exists
try {
  const dbDir = dirname(config.DB_PATH);
  mkdirSync(dbDir, { recursive: true });
  logger.info(`📁 Database directory ready: ${dbDir}`);
} catch (error) {
  logger.error('❌ Error creating database directory:', error);
  process.exit(1);
}

// Initialize database
try {
  DatabaseService.getInstance(config.DB_PATH);
  logger.info('✅ Database service initialized');
} catch (error) {
  logger.error('❌ Error initializing database:', error);
  process.exit(1);
}

// Start the bot (must be imported after database initialization)
import './bot';
