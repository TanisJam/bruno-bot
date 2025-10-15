import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
} from 'discord.js';
import { DatabaseService } from '../services/database.service';
import config from '../config';
import { logger } from '../utils/logger';

// State Management
export const reminderCreationState = new Map<string, Partial<any>>();

// Constants
export const DAYS_OF_WEEK = [
  { name: 'Domingo', value: '0' },
  { name: 'Lunes', value: '1' },
  { name: 'Martes', value: '2' },
  { name: 'Miércoles', value: '3' },
  { name: 'Jueves', value: '4' },
  { name: 'Viernes', value: '5' },
  { name: 'Sábado', value: '6' },
];

// Helper Functions
export function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek.toString())?.name || 'Desconocido';
}

export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

// Slash Command Definition
export const data = new SlashCommandBuilder()
  .setName('recordatorio')
  .setDescription('Gestiona recordatorios semanales')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(subcommand => subcommand.setName('crear').setDescription('Crea un nuevo recordatorio de forma interactiva'))
  .addSubcommand(subcommand => subcommand.setName('editar').setDescription('Edita un recordatorio existente').addIntegerOption(o => o.setName('id').setDescription('ID del recordatorio').setRequired(true)))
  .addSubcommand(subcommand => subcommand.setName('listar').setDescription('Lista todos los recordatorios'))
  .addSubcommand(subcommand => subcommand.setName('activar').setDescription('Activa un recordatorio').addIntegerOption(o => o.setName('id').setDescription('ID del recordatorio').setRequired(true)))
  .addSubcommand(subcommand => subcommand.setName('desactivar').setDescription('Desactiva un recordatorio').addIntegerOption(o => o.setName('id').setDescription('ID del recordatorio').setRequired(true)))
  .addSubcommand(subcommand => subcommand.setName('eliminar').setDescription('Elimina un recordatorio').addIntegerOption(o => o.setName('id').setDescription('ID del recordatorio').setRequired(true)));

// Command Execution Router
export async function execute(interaction: ChatInputCommandInteraction) {
  const db = DatabaseService.getInstance(config.DB_PATH);
  db.ensureGuild(interaction.guildId!, interaction.guild!.name);

  const subcommand = interaction.options.getSubcommand();
  switch (subcommand) {
    case 'crear': await handleCreate(interaction); break;
    case 'editar': await handleEdit(interaction, db); break;
    case 'listar': await handleList(interaction, db); break;
    case 'activar': await handleToggle(interaction, db, true); break;
    case 'desactivar': await handleToggle(interaction, db, false); break;
    case 'eliminar': await handleDelete(interaction, db); break;
  }
}

// --- Subcommand Handlers ---

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const stateId = interaction.user.id;
  reminderCreationState.set(stateId, { isEditing: false, guild_id: interaction.guildId, enabled: true });

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`reminder_create_channel_${stateId}`)
    .setPlaceholder('Selecciona un canal')
    .addChannelTypes(ChannelType.GuildText);
  const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('Creación de Recordatorio (Paso 1 de 3)')
    .setDescription('Por favor, selecciona el canal donde se enviará el recordatorio.');

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleEdit(interaction: ChatInputCommandInteraction, db: DatabaseService) {
  const reminderId = interaction.options.getInteger('id', true);
  const reminder = db.getReminderById(reminderId);

  if (!reminder || reminder.guild_id !== interaction.guildId) {
    await interaction.reply({ content: `❌ No se encontró el recordatorio con ID ${reminderId}.`, ephemeral: true });
    return;
  }

  const stateId = interaction.user.id;
  reminderCreationState.set(stateId, { ...reminder, isEditing: true });

  await renderEditDashboard(interaction, reminder);
}

async function handleList(interaction: ChatInputCommandInteraction, db: DatabaseService) {
    const reminders = db.getReminders(interaction.guildId!);
    if (reminders.length === 0) {
        await interaction.reply({ content: '📋 No hay recordatorios configurados.', ephemeral: true });
        return;
    }
    const embed = new EmbedBuilder().setColor(0x0099ff).setTitle('📋 Recordatorios del Servidor').setDescription(`Total: ${reminders.length}`);
    reminders.forEach(r => {
        embed.addFields({ name: `ID: ${r.id} | ${r.enabled ? '🟢 Activo' : '🔴 Inactivo'}`, value: `📍 <#${r.channel_id}>
📅 ${getDayName(r.day_of_week)} a las ${r.time}
💬 ${r.message.substring(0, 100)}` });
    });
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleToggle(interaction: ChatInputCommandInteraction, db: DatabaseService, enabled: boolean) {
    const id = interaction.options.getInteger('id', true);
    const updated = db.updateReminder(id, { enabled });
    if (!updated || updated.guild_id !== interaction.guildId) {
        await interaction.reply({ content: `❌ No se encontró el recordatorio con ID ${id}.`, ephemeral: true });
        return;
    }
    await interaction.reply({ content: `✅ Recordatorio ID ${id} ha sido ${enabled ? 'activado' : 'desactivado'}.`, ephemeral: true });
}

async function handleDelete(interaction: ChatInputCommandInteraction, db: DatabaseService) {
    const id = interaction.options.getInteger('id', true);
    const deleted = db.deleteReminder(id, interaction.guildId!);
    if (!deleted) {
        await interaction.reply({ content: `❌ No se encontró el recordatorio con ID ${id}.`, ephemeral: true });
        return;
    }
    await interaction.reply({ content: `🗑️ Recordatorio ID ${id} ha sido eliminado.`, ephemeral: true });
}

// --- Edit Dashboard Renderer ---

export async function renderEditDashboard(interaction: any, state: any) {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('Panel de Edición de Recordatorio')
    .setDescription('Modifica las partes que necesites y luego guarda los cambios.')
    .addFields(
      { name: 'Canal', value: `<#${state.channel_id}>`, inline: true },
      { name: 'Día', value: getDayName(state.day_of_week), inline: true },
      { name: 'Hora', value: state.time, inline: true },
      { name: 'Mensaje', value: state.message.substring(0, 1024) }
    );

  const stateId = interaction.user.id;

  const channelButton = new ButtonBuilder().setCustomId(`reminder_edit_show-channel_${stateId}`).setLabel('Canal').setStyle(ButtonStyle.Secondary);
  const dayButton = new ButtonBuilder().setCustomId(`reminder_edit_show-day_${stateId}`).setLabel('Día').setStyle(ButtonStyle.Secondary);
  const detailsButton = new ButtonBuilder().setCustomId(`reminder_edit_show-details_${stateId}`).setLabel('Hora y Mensaje').setStyle(ButtonStyle.Secondary);
  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(channelButton, dayButton, detailsButton);

  const saveButton = new ButtonBuilder().setCustomId(`reminder_edit_save_${stateId}`).setLabel('Guardar Cambios').setStyle(ButtonStyle.Success);
  const cancelButton = new ButtonBuilder().setCustomId(`reminder_edit_cancel_${stateId}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger);
  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton, cancelButton);

  const payload = { embeds: [embed], components: [firstRow, secondRow], ephemeral: true };

  if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
    await interaction.update(payload);
  } else {
    await interaction.reply(payload);
  }
}
