import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { DatabaseService } from '../services/database.service';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * Day of week mapping for Spanish
 */
const DAYS_OF_WEEK = [
  { name: 'Domingo', value: 0 },
  { name: 'Lunes', value: 1 },
  { name: 'Martes', value: 2 },
  { name: 'Miércoles', value: 3 },
  { name: 'Jueves', value: 4 },
  { name: 'Viernes', value: 5 },
  { name: 'Sábado', value: 6 }
];

/**
 * Get day name in Spanish
 */
function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK[dayOfWeek]?.name || 'Desconocido';
}

/**
 * Reminder command definition
 */
export const data = new SlashCommandBuilder()
  .setName('recordatorio')
  .setDescription('Gestiona recordatorios semanales para sesiones de juego')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(subcommand =>
    subcommand
      .setName('crear')
      .setDescription('Crea un nuevo recordatorio semanal')
      .addChannelOption(option =>
        option
          .setName('canal')
          .setDescription('Canal donde enviar el recordatorio')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('mensaje')
          .setDescription('Mensaje del recordatorio')
          .setRequired(true)
          .setMaxLength(2000)
      )
      .addIntegerOption(option =>
        option
          .setName('dia')
          .setDescription('Día de la semana')
          .setRequired(true)
          .addChoices(
            ...DAYS_OF_WEEK.map(day => ({ name: day.name, value: day.value }))
          )
      )
      .addStringOption(option =>
        option
          .setName('hora')
          .setDescription('Hora del recordatorio (formato 24h: HH:MM, ej: 19:00)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('listar')
      .setDescription('Lista todos los recordatorios del servidor')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('activar')
      .setDescription('Activa un recordatorio')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del recordatorio')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('desactivar')
      .setDescription('Desactiva un recordatorio')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del recordatorio')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('eliminar')
      .setDescription('Elimina un recordatorio')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del recordatorio')
          .setRequired(true)
      )
  );

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

/**
 * Execute the reminder command
 */
export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Este comando solo puede usarse en un servidor.',
      ephemeral: true
    });
    return;
  }

  const db = DatabaseService.getInstance(config.DB_PATH);
  const subcommand = interaction.options.getSubcommand();

  try {
    // Ensure guild exists in database
    db.ensureGuild(interaction.guild.id, interaction.guild.name);

    switch (subcommand) {
      case 'crear':
        await handleCreate(interaction, db);
        break;
      case 'listar':
        await handleList(interaction, db);
        break;
      case 'activar':
        await handleToggle(interaction, db, true);
        break;
      case 'desactivar':
        await handleToggle(interaction, db, false);
        break;
      case 'eliminar':
        await handleDelete(interaction, db);
        break;
      default:
        await interaction.reply({
          content: '❌ Subcomando desconocido.',
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Error in reminder command:', error);
    const errorMessage = '❌ Ocurrió un error al procesar tu solicitud.';

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle crear subcommand
 */
async function handleCreate(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const channel = interaction.options.getChannel('canal', true);
  const message = interaction.options.getString('mensaje', true);
  const dayOfWeek = interaction.options.getInteger('dia', true);
  const time = interaction.options.getString('hora', true);

  // Validate time format
  if (!isValidTime(time)) {
    await interaction.reply({
      content: '❌ Formato de hora inválido. Usa el formato HH:MM (24 horas), por ejemplo: 19:00',
      ephemeral: true
    });
    return;
  }

  // Validate channel type
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: '❌ El canal debe ser un canal de texto.',
      ephemeral: true
    });
    return;
  }

  // Create reminder in database
  const reminder = db.createReminder({
    guild_id: interaction.guild!.id,
    channel_id: channel.id,
    message,
    day_of_week: dayOfWeek,
    time,
    enabled: true
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Recordatorio Creado')
    .setDescription('El recordatorio ha sido creado exitosamente.')
    .addFields(
      { name: 'ID', value: reminder.id.toString(), inline: true },
      { name: 'Canal', value: `<#${channel.id}>`, inline: true },
      { name: 'Día', value: getDayName(dayOfWeek), inline: true },
      { name: 'Hora', value: time, inline: true },
      { name: 'Estado', value: reminder.enabled ? '🟢 Activo' : '🔴 Inactivo', inline: true },
      { name: 'Mensaje', value: message }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Reminder created: ID ${reminder.id} for guild ${interaction.guild!.id}`);
}

/**
 * Handle listar subcommand
 */
async function handleList(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const reminders = db.getReminders(interaction.guild!.id);

  if (reminders.length === 0) {
    await interaction.reply({
      content: '📋 No hay recordatorios configurados en este servidor.\nUsa `/recordatorio crear` para crear uno.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('📋 Recordatorios del Servidor')
    .setDescription(`Total: ${reminders.length} recordatorio(s)`)
    .setTimestamp();

  reminders.forEach(reminder => {
    const status = reminder.enabled ? '🟢 Activo' : '🔴 Inactivo';
    const channel = `<#${reminder.channel_id}>`;
    const dayName = getDayName(reminder.day_of_week);

    embed.addFields({
      name: `ID: ${reminder.id} | ${status}`,
      value: `📍 Canal: ${channel}\n📅 ${dayName} a las ${reminder.time}\n💬 Mensaje: ${reminder.message.substring(0, 100)}${reminder.message.length > 100 ? '...' : ''}`
    });
  });

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle activar/desactivar subcommands
 */
async function handleToggle(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  enabled: boolean
): Promise<void> {
  const id = interaction.options.getInteger('id', true);

  // Check if reminder exists and belongs to this guild
  const reminders = db.getReminders(interaction.guild!.id);
  const reminder = reminders.find(r => r.id === id);

  if (!reminder) {
    await interaction.reply({
      content: `❌ No se encontró el recordatorio con ID ${id} en este servidor.\nUsa \`/recordatorio listar\` para ver los IDs disponibles.`,
      ephemeral: true
    });
    return;
  }

  // Update reminder
  const updated = db.updateReminder(id, { enabled });

  if (!updated) {
    await interaction.reply({
      content: '❌ Error al actualizar el recordatorio.',
      ephemeral: true
    });
    return;
  }

  const statusText = enabled ? 'activado' : 'desactivado';
  const statusEmoji = enabled ? '🟢' : '🔴';

  const embed = new EmbedBuilder()
    .setColor(enabled ? 0x00ff00 : 0xff9900)
    .setTitle(`${statusEmoji} Recordatorio ${statusText}`)
    .setDescription(`El recordatorio ID ${id} ha sido ${statusText}.`)
    .addFields(
      { name: 'Canal', value: `<#${reminder.channel_id}>`, inline: true },
      { name: 'Día', value: getDayName(reminder.day_of_week), inline: true },
      { name: 'Hora', value: reminder.time, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Reminder ${id} ${statusText} for guild ${interaction.guild!.id}`);
}

/**
 * Handle eliminar subcommand
 */
async function handleDelete(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const id = interaction.options.getInteger('id', true);

  // Check if reminder exists and belongs to this guild
  const reminders = db.getReminders(interaction.guild!.id);
  const reminder = reminders.find(r => r.id === id);

  if (!reminder) {
    await interaction.reply({
      content: `❌ No se encontró el recordatorio con ID ${id} en este servidor.\nUsa \`/recordatorio listar\` para ver los IDs disponibles.`,
      ephemeral: true
    });
    return;
  }

  // Delete reminder
  const deleted = db.deleteReminder(id);

  if (!deleted) {
    await interaction.reply({
      content: '❌ Error al eliminar el recordatorio.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('🗑️ Recordatorio Eliminado')
    .setDescription(`El recordatorio ID ${id} ha sido eliminado permanentemente.`)
    .addFields(
      { name: 'Canal', value: `<#${reminder.channel_id}>`, inline: true },
      { name: 'Día', value: getDayName(reminder.day_of_week), inline: true },
      { name: 'Hora', value: reminder.time, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Reminder ${id} deleted for guild ${interaction.guild!.id}`);
}
