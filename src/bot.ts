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
  // Handle slash commands
  if (interaction.isCommand()) {
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
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      const customId = interaction.customId;

      // Handle shop modals
      if (customId.startsWith('shop_')) {
        await handleShopModal(interaction);
      }
    } catch (error) {
      logger.error('❌ Error handling modal submission:', error);

      const errorMessage = '❌ Hubo un error procesando el formulario.';

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  }
});

/**
 * Handle shop modal submissions
 */
async function handleShopModal(interaction: any) {
  const { parseItemModalSubmission } = await import('./utils/shop-modals');
  const { DatabaseService } = await import('./services/database.service');
  const { EmbedBuilder } = await import('discord.js');

  const customId = interaction.customId;
  const db = DatabaseService.getInstance(config.DB_PATH);

  // Get field values
  const name = interaction.fields.getTextInputValue('item_name');
  const type = interaction.fields.getTextInputValue('item_type');
  const rarity = interaction.fields.getTextInputValue('item_rarity');
  const price = interaction.fields.getTextInputValue('item_price');
  const description = interaction.fields.getTextInputValue('item_description');

  // Parse and validate
  const result = parseItemModalSubmission(name, type, rarity, price, description);

  if ('error' in result) {
    await interaction.reply({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
    return;
  }

  // Handle add item
  if (customId === 'shop_add_item') {
    const item = db.createItem({
      guild_id: interaction.guild?.id || null,
      name: result.name,
      type: result.type,
      rarity: result.rarity,
      base_price: result.price,
      link: null,
      description: result.description
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Ítem Agregado al Catálogo')
      .setDescription(`**${item.name}** ha sido agregado exitosamente.`)
      .addFields(
        { name: 'ID', value: item.id.toString(), inline: true },
        { name: 'Tipo', value: item.type, inline: true },
        { name: 'Rareza', value: item.rarity, inline: true },
        { name: 'Precio Base', value: `${item.base_price} po`, inline: true }
      )
      .setTimestamp();

    if (item.description) {
      embed.addFields({ name: 'Descripción', value: item.description, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
    logger.info(`Item ${item.id} added to catalog by ${interaction.user.username}`);
  }

  // Handle edit item
  else if (customId.startsWith('shop_edit_item_')) {
    const itemId = parseInt(customId.replace('shop_edit_item_', ''));

    const updated = db.updateItem(itemId, {
      name: result.name,
      type: result.type,
      rarity: result.rarity,
      base_price: result.price,
      description: result.description
    });

    if (!updated) {
      await interaction.reply({
        content: '❌ Error al actualizar el ítem.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('✅ Ítem Actualizado')
      .setDescription(`**${updated.name}** ha sido actualizado exitosamente.`)
      .addFields(
        { name: 'ID', value: updated.id.toString(), inline: true },
        { name: 'Tipo', value: updated.type, inline: true },
        { name: 'Rareza', value: updated.rarity, inline: true },
        { name: 'Precio Base', value: `${updated.base_price} po`, inline: true }
      )
      .setTimestamp();

    if (updated.description) {
      embed.addFields({ name: 'Descripción', value: updated.description, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
    logger.info(`Item ${itemId} updated in catalog by ${interaction.user.username}`);
  }
}

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
