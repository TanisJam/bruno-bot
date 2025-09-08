import { REST, Routes } from 'discord.js';
import config from './config';
import * as commandsModules from './commands';
import { Command } from './types/Command';
import { logger } from './utils/logger';

/**
 * Deploy Discord slash commands to the specified guild
 */
async function deployCommands() {
  try {
    logger.info('🔄 Started refreshing application (/) commands...');

    // Collect all command data
    const commands = Object(commandsModules) as Record<string, Command>;
    const commandsData = Object.values(commands).map(command => command.data.toJSON());

    logger.info(`📝 Found ${commandsData.length} commands to deploy`);

    // Create REST instance
    const rest = new REST({ version: '10' }).setToken(config.TOKEN);

    // Deploy commands to the guild
    const data = await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: commandsData },
    ) as any[];

    logger.info(`✅ Successfully reloaded ${data.length} application (/) commands`);
    
    // Log deployed commands
    data.forEach((command: any) => {
      logger.info(`   • /${command.name} - ${command.description}`);
    });

  } catch (error) {
    logger.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run the deployment
deployCommands();
