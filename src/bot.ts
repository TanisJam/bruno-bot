import { Client, IntentsBitField, Events, Collection } from 'discord.js';
import config from './config';
import * as commandsModules from './commands';
import { Command } from './types/Command';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { SchedulerService } from './services/scheduler.service';

/**
 * Create Discord client with necessary intents
 */
export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

/**
 * Collection to store commands
 */
client.commands = new Collection<string, Command>();


/**
 * Initialize and register commands
 */
const commands = Object(commandsModules) as Record<string, Command>;
Object.keys(commands).forEach((commandName) => {
  const command = commands[commandName];
  if (command) {
    client.commands.set(commandName, command);
    logger.info(`Command registered: ${commandName}`);
  }
});

/**
 * Initialize database and scheduler
 */
let schedulerService: SchedulerService;

try {
  // Initialize database
  const db = DatabaseService.getInstance(config.DB_PATH);
  logger.info('✅ Database service initialized');

  // Initialize scheduler (will start after bot is ready)
  schedulerService = new SchedulerService(client, db);
} catch (error) {
  logger.error('❌ Error initializing services:', error);
  process.exit(1);
}

/**
 * Event when bot is ready
 */
client.once(Events.ClientReady, async () => {
  logger.info(`🤖 ${client.user?.username} is online and ready!`);
  logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

  // Ensure all guilds are registered in database
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      DatabaseService.getInstance().ensureGuild(guildId, guild.name);
      logger.info(`✅ Guild registered: ${guild.name} (${guildId})`);
    } catch (error) {
      logger.error(`❌ Error registering guild ${guildId}:`, error);
    }
  }

  // Start scheduler
  schedulerService.start();
});

/**
 * Handle command interactions
 */
client.on(Events.InteractionCreate, async (interaction) => {
  // Only handle slash commands
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const command = client.commands.get(commandName);

  if (!command) {
    logger.warn(`Unknown command attempted: ${commandName}`);
    return;
  }

  try {
    logger.info(`🎮 ${interaction.user.username} executed: /${commandName}`);
    await command.execute(interaction, client);
  } catch (error) {
    logger.error(`❌ Error executing command ${commandName}:`, error);
    
    // Respond to user with error message
    const errorMessage = '❌ Hubo un error ejecutando este comando. Inténtalo de nuevo más tarde.';
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: errorMessage
      });
    } else {
      await interaction.followUp({
        content: errorMessage,
        ephemeral: true
      });
    }
  }
});

/**
 * Handle errors and warnings
 */
client.on('error', (error) => {
  logger.error('Discord client error:', error);
});

client.on('warn', (warning) => {
  logger.warn('Discord client warning:', warning);
});

/**
 * Log in the bot
 */
client.login(config.TOKEN).catch(error => {
  logger.error('❌ Error logging in the bot:', error);
  process.exit(1);
});

/**
 * Handle uncaught rejections
 */
process.on('unhandledRejection', (error) => {
  logger.error('🚨 Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught exception:', error);
  process.exit(1);
});

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  schedulerService.stop();
  DatabaseService.getInstance().close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  schedulerService.stop();
  DatabaseService.getInstance().close();
  process.exit(0);
});

/**
 * Extend Discord.js Client interface to include commands collection
 */
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
