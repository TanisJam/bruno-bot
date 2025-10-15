import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';

const DAYS_OF_WEEK = [
  { label: 'Domingo', value: '0' },
  { label: 'Lunes', value: '1' },
  { label: 'Martes', value: '2' },
  { label: 'Miércoles', value: '3' },
  { label: 'Jueves', value: '4' },
  { label: 'Viernes', value: '5' },
  { label: 'Sábado', value: '6' },
];

export function createReminderModal(reminder?: any) {
  const modal = new ModalBuilder()
    .setCustomId(reminder ? `reminder_edit_${reminder.id}` : 'reminder_create')
    .setTitle(reminder ? 'Editar Recordatorio' : 'Crear Recordatorio');

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('reminder_channel')
    .setPlaceholder('Selecciona un canal')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true);

  const messageInput = new TextInputBuilder()
    .setCustomId('reminder_message')
    .setLabel('Mensaje del recordatorio')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const daySelect = new StringSelectMenuBuilder()
    .setCustomId('reminder_day')
    .setPlaceholder('Selecciona un día de la semana')
    .addOptions(DAYS_OF_WEEK)
    .setRequired(true);

  const timeInput = new TextInputBuilder()
    .setCustomId('reminder_time')
    .setLabel('Hora (formato 24h: HH:MM)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  if (reminder) {
    channelSelect.setDefaultChannels(reminder.channel_id);
    messageInput.setValue(reminder.message);
    timeInput.setValue(reminder.time);
  }

  const firstActionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);
  const secondActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(daySelect);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput);
  const fourthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);

  modal.addComponents(firstActionRow as any, secondActionRow as any, thirdActionRow, fourthActionRow);

  return modal;
}