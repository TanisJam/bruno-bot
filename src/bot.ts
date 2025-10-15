import {
  Client,
  IntentsBitField,
  Events,
  Collection,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Interaction,
  ChannelType
} from 'discord.js';
import config from './config';
import * as commandsModules from './commands';
import { reminderCreationState, DAYS_OF_WEEK, getDayName, isValidTime, renderEditDashboard } from './commands/reminder';
import { Command } from './types/Command';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { SchedulerService } from './services/scheduler.service';

// Main Discord Client
export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Command Collection
client.commands = new Collection<string, Command>();
const commands = Object(commandsModules) as Record<string, Command>;
for (const commandName in commands) {
  const command = commands[commandName];
  if (command) {
    client.commands.set(commandName, command);
    logger.info(`Command registered: ${commandName}`);
  }
}

// Initialize Services
let schedulerService: SchedulerService;
try {
  const db = DatabaseService.getInstance(config.DB_PATH);
  logger.info('✅ Database service initialized');
  schedulerService = new SchedulerService(client, db);
} catch (error) {
  logger.error('❌ Error initializing services:', error);
  process.exit(1);
}

// Client Ready Event
client.once(Events.ClientReady, async () => {
  logger.info(`🤖 ${client.user?.username} is online and ready!`);
  logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      DatabaseService.getInstance().ensureGuild(guildId, guild.name);
      logger.info(`✅ Guild registered: ${guild.name} (${guildId})`);
    } catch (error) {
      logger.error(`❌ Error registering guild ${guildId}:`, error);
    }
  }
  schedulerService.start();
});

// Interaction Create Event
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        logger.info(`🎮 ${interaction.user.username} executed: /${interaction.commandName}`);
        await command.execute(interaction, client);
      }
    } else if (interaction.isAnySelectMenu()) {
        if (interaction.customId.startsWith('reminder_create')) await handleReminderCreateFlow(interaction);
        if (interaction.customId.startsWith('reminder_edit')) await handleReminderEditFlow(interaction);
    } else if (interaction.isButton()) {
        if (interaction.customId.startsWith('reminder_create')) await handleReminderCreateFlow(interaction);
        if (interaction.customId.startsWith('reminder_edit')) await handleReminderEditFlow(interaction);
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('shop_')) {
        await handleShopModal(interaction);
      } else if (interaction.customId.startsWith('reminder_create')) {
        await handleReminderCreateModal(interaction);
      } else if (interaction.customId.startsWith('reminder_edit')) {
        await handleReminderEditModal(interaction);
      }
    }
  } catch (error) {
    logger.error('❌ Error during interaction:', error);
    if (interaction.isRepliable()) {
      const errorMessage = '❌ Hubo un error procesando la interacción.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
});

// --- Reminder Flow Handlers ---

async function handleReminderCreateFlow(interaction: any) {
    const [_, __, step, stateId] = interaction.customId.split('_');
    const state = reminderCreationState.get(stateId);
    if (!state) return interaction.update({ content: '❌ Esta interacción ha expirado.', components: [], embeds: [] });

    const embed = new EmbedBuilder(interaction.message.embeds[0].data);

    if (step === 'channel') {
        state.channel_id = interaction.values[0];
        const daySelect = new StringSelectMenuBuilder().setCustomId(`reminder_create_day_${stateId}`).setPlaceholder('Selecciona un día').addOptions(DAYS_OF_WEEK.map(d => ({ label: d.name, value: d.value })));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(daySelect);
        embed.setTitle('Paso 2 de 3: Día de la semana').setDescription('Ahora, selecciona el día.');
        await interaction.update({ embeds: [embed], components: [row] });
    }

    if (step === 'day') {
        state.day_of_week = parseInt(interaction.values[0]);
        const detailsButton = new ButtonBuilder().setCustomId(`reminder_create_details_${stateId}`).setLabel('Añadir Hora y Mensaje').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(detailsButton);
        embed.setTitle('Paso 3 de 3: Detalles Finales').setDescription('Haz clic para añadir la hora y el mensaje.');
        await interaction.update({ embeds: [embed], components: [row] });
    }

    if (step === 'details') {
        const detailsModal = new ModalBuilder().setCustomId(`reminder_create_details-modal_${stateId}`).setTitle('Establecer Hora y Mensaje');
        const timeInput = new TextInputBuilder().setCustomId('time_input').setLabel('Hora (formato 24h: HH:MM)').setStyle(TextInputStyle.Short).setRequired(true);
        const messageInput = new TextInputBuilder().setCustomId('message_input').setLabel('Mensaje del recordatorio').setStyle(TextInputStyle.Paragraph).setRequired(true);
        detailsModal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput), new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
        await interaction.showModal(detailsModal);
    }

    if (step === 'save') {
        const db = DatabaseService.getInstance();
        const reminder = db.createReminder(state as any);
        if (!reminder) return interaction.update({ content: '❌ Hubo un error al guardar.', embeds: [], components: [] });

        const finalEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Recordatorio Creado').setDescription('El recordatorio se ha guardado correctamente.');
        await interaction.update({ embeds: [finalEmbed], components: [] });
        reminderCreationState.delete(stateId);
    }
}

async function handleReminderEditFlow(interaction: any) {
    const [_, __, action, stateId] = interaction.customId.split('_');
    const state = reminderCreationState.get(stateId);
    if (!state) return interaction.update({ content: '❌ Esta interacción ha expirado.', components: [], embeds: [] });

    const [mainAction, subAction] = action.split('-');

    if (mainAction === 'show') {
        if (subAction === 'channel') {
            const channelSelect = new ChannelSelectMenuBuilder().setCustomId(`reminder_edit_set-channel_${stateId}`).setPlaceholder('Selecciona el nuevo canal').addChannelTypes(ChannelType.GuildText);
            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);
            return interaction.update({ components: [row] });
        }
        if (subAction === 'day') {
            const daySelect = new StringSelectMenuBuilder().setCustomId(`reminder_edit_set-day_${stateId}`).setPlaceholder('Selecciona el nuevo día').addOptions(DAYS_OF_WEEK.map(d => ({ label: d.name, value: d.value })));
            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(daySelect);
            return interaction.update({ components: [row] });
        }
        if (subAction === 'details') {
            const detailsModal = new ModalBuilder().setCustomId(`reminder_edit_details-modal_${stateId}`).setTitle('Establecer Hora y Mensaje');
            const timeInput = new TextInputBuilder().setCustomId('time_input').setLabel('Hora (formato 24h: HH:MM)').setStyle(TextInputStyle.Short).setRequired(true).setValue(state.time);
            const messageInput = new TextInputBuilder().setCustomId('message_input').setLabel('Mensaje del recordatorio').setStyle(TextInputStyle.Paragraph).setRequired(true).setValue(state.message);
            detailsModal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput), new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
            return interaction.showModal(detailsModal);
        }
    }

    if (mainAction === 'set') {
        if (subAction === 'channel') state.channel_id = interaction.values[0];
        if (subAction === 'day') state.day_of_week = parseInt(interaction.values[0]);
        await renderEditDashboard(interaction, state);
    }

    if (mainAction === 'save') {
        const db = DatabaseService.getInstance();
        const reminder = db.updateReminder(state.id, state);
        if (!reminder) return interaction.update({ content: '❌ Hubo un error al guardar.', embeds: [], components: [] });
        
        const finalEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Recordatorio Actualizado').setDescription('El recordatorio se ha guardado correctamente.');
        await interaction.update({ embeds: [finalEmbed], components: [] });
        reminderCreationState.delete(stateId);
    }

    if (mainAction === 'cancel') {
        reminderCreationState.delete(stateId);
        await interaction.update({ content: 'Operación cancelada.', embeds: [], components: [] });
    }
}

async function handleReminderCreateModal(interaction: any) {
    const [_, __, action, ___, stateId] = interaction.customId.split('_');
    const state = reminderCreationState.get(stateId);
    if (!state) return interaction.reply({ content: '❌ Esta interacción ha expirado.', ephemeral: true });

    if (action === 'details-modal') {
        const time = interaction.fields.getTextInputValue('time_input');
        if (!isValidTime(time)) {
            return interaction.reply({ content: '❌ Formato de hora inválido. Usa HH:MM.', ephemeral: true });
        }
        state.time = time;
        state.message = interaction.fields.getTextInputValue('message_input');

        const embed = new EmbedBuilder(interaction.message.embeds[0].data)
            .setTitle('Creación de Recordatorio (Completo)')
            .setDescription('Todos los datos han sido rellenados. Haz clic en guardar para finalizar.');
        const saveButton = new ButtonBuilder().setCustomId(`reminder_create_save_${stateId}`).setLabel('Guardar Recordatorio').setStyle(ButtonStyle.Success);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);
        await interaction.update({ embeds: [embed], components: [row] });
    }
}

async function handleReminderEditModal(interaction: any) {
    // Corregir el parseo del customId para manejar "details-modal" correctamente
    const parts = interaction.customId.split('_');
    const action = parts[2]; // "details-modal"
    const stateId = parts[3]; // ID del usuario
    
    const state = reminderCreationState.get(stateId);
    if (!state) {
        return interaction.reply({ content: '❌ Esta interacción ha expirado.', ephemeral: true });
    }

    if (action === 'details-modal') {
        const time = interaction.fields.getTextInputValue('time_input');
        if (!isValidTime(time)) {
            return interaction.reply({ content: '❌ Formato de hora inválido. Usa HH:MM.', ephemeral: true });
        }
        
        state.time = time;
        state.message = interaction.fields.getTextInputValue('message_input');
        await renderEditDashboard(interaction, state);
    }
}

// --- Shop Modal Handler ---

async function handleShopModal(interaction: any) {
  const { parseItemModalSubmission } = await import('./utils/shop-modals');
  const db = DatabaseService.getInstance(config.DB_PATH);

  const customId = interaction.customId;
  const name = interaction.fields.getTextInputValue('item_name');
  const type = interaction.fields.getTextInputValue('item_type');
  const rarity = interaction.fields.getTextInputValue('item_rarity');
  const price = interaction.fields.getTextInputValue('item_price');
  const description = interaction.fields.getTextInputValue('item_description');

  const result = parseItemModalSubmission(name, type, rarity, price, description);

  if ('error' in result) {
    return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }

  if (customId === 'shop_add_item') {
    const item = db.createItem({ 
        guild_id: interaction.guild?.id || null, 
        name: result.name, 
        type: result.type, 
        rarity: result.rarity, 
        base_price: result.price, 
        description: result.description, 
        link: null 
    });
    const embed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Ítem Agregado').setDescription(`**${item.name}** ha sido agregado.`);
    await interaction.reply({ embeds: [embed] });
  } else if (customId.startsWith('shop_edit_item_')) {
    const itemId = parseInt(customId.replace('shop_edit_item_', ''));
    const updated = db.updateItem(itemId, result);
    if (!updated) {
        return interaction.reply({ content: '❌ Error al actualizar el ítem.', ephemeral: true });
    }
    const embed = new EmbedBuilder().setColor(0x0099ff).setTitle('✅ Ítem Actualizado').setDescription(`**${updated.name}** ha sido actualizado.`);
    await interaction.reply({ embeds: [embed] });
  }
}

// --- Process Handlers ---

process.on('unhandledRejection', (error) => logger.error('🚨 Unhandled rejection:', error));
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught exception:', error);
  process.exit(1);
});

const shutdown = () => {
  logger.info('🛑 Shutting down gracefully...');
  schedulerService.stop();
  DatabaseService.getInstance().close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Discord Client Login
client.login(config.TOKEN).catch(error => {
  logger.error('❌ Error logging in:', error);
  process.exit(1);
});

// Extend Discord.js Client interface
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}