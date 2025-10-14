import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import * as DBTypes from '../types/Database';

/**
 * Create modal for adding a new item to catalog
 */
export function createAddItemModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('shop_add_item')
    .setTitle('Agregar Ítem al Catálogo');

  // Name input
  const nameInput = new TextInputBuilder()
    .setCustomId('item_name')
    .setLabel('Nombre del Ítem')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Espada Larga +1');

  // Type input
  const typeInput = new TextInputBuilder()
    .setCustomId('item_type')
    .setLabel('Tipo')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20)
    .setPlaceholder('weapon, armor, potion, scroll, wondrous, misc');

  // Rarity input with better hint
  const rarityInput = new TextInputBuilder()
    .setCustomId('item_rarity')
    .setLabel('Rareza (escribe una de las opciones)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20)
    .setPlaceholder('common / uncommon / rare / very rare / legendary');

  // Price input
  const priceInput = new TextInputBuilder()
    .setCustomId('item_price')
    .setLabel('Precio Base (po)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10)
    .setPlaceholder('500');

  // Description input (replaces link for better UX)
  const descriptionInput = new TextInputBuilder()
    .setCustomId('item_description')
    .setLabel('Descripción (opcional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Descripción detallada del ítem...');

  // Add inputs to action rows
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rarityInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  );

  return modal;
}

/**
 * Create modal for editing an existing item
 * Pre-fills with current values
 */
export function createEditItemModal(item: DBTypes.ItemCatalog): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`shop_edit_item_${item.id}`)
    .setTitle(`Editar: ${item.name.substring(0, 30)}`);

  // Name input (pre-filled)
  const nameInput = new TextInputBuilder()
    .setCustomId('item_name')
    .setLabel('Nombre del Ítem')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setValue(item.name);

  // Type input (pre-filled)
  const typeInput = new TextInputBuilder()
    .setCustomId('item_type')
    .setLabel('Tipo')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20)
    .setValue(item.type);

  // Rarity input (pre-filled) with better hint
  const rarityInput = new TextInputBuilder()
    .setCustomId('item_rarity')
    .setLabel('Rareza (escribe una de las opciones)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20)
    .setValue(item.rarity)
    .setPlaceholder('common / uncommon / rare / very rare / legendary');

  // Price input (pre-filled)
  const priceInput = new TextInputBuilder()
    .setCustomId('item_price')
    .setLabel('Precio Base (po)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10)
    .setValue(item.base_price.toString());

  // Description input (pre-filled if exists)
  const descriptionInput = new TextInputBuilder()
    .setCustomId('item_description')
    .setLabel('Descripción (opcional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Descripción detallada del ítem...');

  if (item.description) {
    descriptionInput.setValue(item.description);
  }

  // Add inputs to action rows
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rarityInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  );

  return modal;
}

/**
 * Parse and validate modal submission data
 */
export interface ItemModalData {
  name: string;
  type: string;
  rarity: string;
  price: number;
  description: string | null;
}

export function parseItemModalSubmission(
  name: string,
  type: string,
  rarity: string,
  price: string,
  description: string
): ItemModalData | { error: string } {
  // Validate name
  if (!name || name.trim().length === 0) {
    return { error: 'El nombre del ítem es requerido' };
  }

  // Validate type
  const validTypes = ['weapon', 'armor', 'potion', 'scroll', 'wondrous', 'misc'];
  if (!validTypes.includes(type.toLowerCase())) {
    return { error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}` };
  }

  // Validate rarity
  const validRarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  if (!validRarities.includes(rarity.toLowerCase())) {
    return { error: `Rareza inválida. Debe ser uno de: ${validRarities.join(', ')}` };
  }

  // Validate price
  const priceNum = parseInt(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return { error: 'El precio debe ser un número positivo' };
  }

  // Process description (optional)
  let descriptionValue: string | null = null;
  if (description && description.trim().length > 0) {
    descriptionValue = description.trim();
  }

  return {
    name: name.trim(),
    type: type.toLowerCase(),
    rarity: rarity.toLowerCase(),
    price: priceNum,
    description: descriptionValue
  };
}
