import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { DatabaseService } from '../services/database.service';
import { ShopService } from '../services/shop.service';
import { createAddItemModal, createEditItemModal, parseItemModalSubmission } from '../utils/shop-modals';
import config from '../config';
import { logger } from '../utils/logger';
import * as ShopTypes from '../types/Shop';

const ITEMS_PER_PAGE = 10;
const PAGINATION_TIMEOUT = 60000; // 60 seconds

/**
 * Shop command definition
 */
export const data = new SlashCommandBuilder()
  .setName('tienda')
  .setDescription('Gestiona la tienda del servidor con ítems mágicos')

  // ==================== CATALOG SUBCOMMANDS ====================

  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-cargar')
      .setDescription('[DM] Carga ítems desde archivos SDR (no sobrescribe existentes)')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-ver')
      .setDescription('Ver catálogo de ítems disponibles')
      .addStringOption(option =>
        option
          .setName('rareza')
          .setDescription('Filtrar por rareza')
          .setRequired(false)
          .addChoices(
            { name: 'Common', value: 'common' },
            { name: 'Uncommon', value: 'uncommon' },
            { name: 'Rare', value: 'rare' },
            { name: 'Very Rare', value: 'very rare' },
            { name: 'Legendary', value: 'legendary' },
            { name: 'Artifact', value: 'artifact' }
          )
      )
      .addStringOption(option =>
        option
          .setName('tipo')
          .setDescription('Filtrar por tipo')
          .setRequired(false)
          .addChoices(
            { name: 'Arma', value: 'weapon' },
            { name: 'Armadura', value: 'armor' },
            { name: 'Poción', value: 'potion' },
            { name: 'Pergamino', value: 'scroll' },
            { name: 'Maravilloso', value: 'wondrous' },
            { name: 'Misceláneo', value: 'misc' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-buscar')
      .setDescription('Buscar un ítem en el catálogo')
      .addStringOption(option =>
        option
          .setName('nombre')
          .setDescription('Nombre del ítem a buscar')
          .setRequired(true)
          .setMinLength(2)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-agregar')
      .setDescription('[DM] Agregar un ítem personalizado al catálogo')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-editar')
      .setDescription('[DM] Editar un ítem del catálogo')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del ítem a editar')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('catalogo-eliminar')
      .setDescription('[DM] Eliminar un ítem del catálogo')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del ítem a eliminar')
          .setRequired(true)
      )
  )

  // ==================== INVENTORY SUBCOMMANDS ====================

  .addSubcommand(subcommand =>
    subcommand
      .setName('inventario-ver')
      .setDescription('Ver inventario actual de la tienda')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('inventario-agregar')
      .setDescription('[DM] Agregar ítem del catálogo al inventario')
      .addIntegerOption(option =>
        option
          .setName('item_id')
          .setDescription('ID del ítem en el catálogo')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('stock')
          .setDescription('Cantidad disponible (dejar vacío para ilimitado)')
          .setRequired(false)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('inventario-quitar')
      .setDescription('[DM] Quitar ítem del inventario')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del ítem en el inventario')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('inventario-stock')
      .setDescription('[DM] Actualizar stock de un ítem')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('ID del ítem en el inventario')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('cantidad')
          .setDescription('Nueva cantidad (0 para ilimitado)')
          .setRequired(true)
          .setMinValue(0)
      )
  )

  // ==================== CONFIG SUBCOMMANDS ====================

  .addSubcommand(subcommand =>
    subcommand
      .setName('config-ver')
      .setDescription('[DM] Ver configuración de la tienda')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('config-varianza')
      .setDescription('[DM] Configurar varianza de precios')
      .addNumberOption(option =>
        option
          .setName('min')
          .setDescription('Multiplicador mínimo (ej: 0.8 = 80%)')
          .setRequired(true)
          .setMinValue(0.1)
          .setMaxValue(1.0)
      )
      .addNumberOption(option =>
        option
          .setName('max')
          .setDescription('Multiplicador máximo (ej: 1.2 = 120%)')
          .setRequired(true)
          .setMinValue(1.0)
          .setMaxValue(3.0)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('config-capacidad')
      .setDescription('[DM] Configurar capacidad máxima del inventario')
      .addIntegerOption(option =>
        option
          .setName('max')
          .setDescription('Número máximo de ítems en inventario')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
  );

/**
 * Check if user has DM permissions
 */
function isDM(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;

  const member = interaction.member;
  if ('permissions' in member && member.permissions) {
    if (typeof member.permissions === 'string') {
      return false;
    }
    return member.permissions.has(PermissionFlagsBits.ManageGuild);
  }

  return false;
}

/**
 * Execute the shop command
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
  const shopService = new ShopService(db);
  const subcommand = interaction.options.getSubcommand();

  // Ensure guild exists in database
  db.ensureGuild(interaction.guild.id, interaction.guild.name);

  // Check DM permissions for DM-only commands
  const dmOnlyCommands = [
    'catalogo-cargar',
    'catalogo-agregar',
    'catalogo-editar',
    'catalogo-eliminar',
    'inventario-agregar',
    'inventario-quitar',
    'inventario-stock',
    'config-ver',
    'config-varianza',
    'config-capacidad'
  ];

  if (dmOnlyCommands.includes(subcommand) && !isDM(interaction)) {
    await interaction.reply({
      content: '❌ Solo los administradores del servidor pueden usar este comando.',
      ephemeral: true
    });
    return;
  }

  try {
    switch (subcommand) {
      // Catalog commands
      case 'catalogo-cargar':
        await handleCatalogLoad(interaction, shopService);
        break;
      case 'catalogo-ver':
        await handleCatalogView(interaction, db, shopService);
        break;
      case 'catalogo-buscar':
        await handleCatalogSearch(interaction, db, shopService);
        break;
      case 'catalogo-agregar':
        await handleCatalogAdd(interaction);
        break;
      case 'catalogo-editar':
        await handleCatalogEdit(interaction, db);
        break;
      case 'catalogo-eliminar':
        await handleCatalogDelete(interaction, db);
        break;

      // Inventory commands
      case 'inventario-ver':
        await handleInventoryView(interaction, db, shopService);
        break;
      case 'inventario-agregar':
        await handleInventoryAdd(interaction, db, shopService);
        break;
      case 'inventario-quitar':
        await handleInventoryRemove(interaction, db);
        break;
      case 'inventario-stock':
        await handleInventoryStock(interaction, db);
        break;

      // Config commands
      case 'config-ver':
        await handleConfigView(interaction, db);
        break;
      case 'config-varianza':
        await handleConfigVariance(interaction, db);
        break;
      case 'config-capacidad':
        await handleConfigCapacity(interaction, db);
        break;

      default:
        await interaction.reply({
          content: '❌ Subcomando desconocido.',
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Error in shop command:', error);
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

// ==================== CATALOG HANDLERS ====================

/**
 * Handle catalogo-cargar subcommand
 */
async function handleCatalogLoad(
  interaction: ChatInputCommandInteraction,
  shopService: ShopService
): Promise<void> {
  await interaction.deferReply();

  const result = await shopService.loadSDRItems(interaction.guild!.id);

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Carga de Catálogo Completada')
    .setDescription('📚 Se han procesado exitosamente los archivos SDR del sistema.')
    .addFields(
      { name: '📥 Nuevos ítems agregados', value: `**${result.added}**`, inline: true },
      { name: '⏭️ Ítems omitidos', value: `**${result.skipped}**`, inline: true }
    )
    .setFooter({ text: 'ℹ️ Los ítems omitidos ya existían en el catálogo' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  logger.info(`Catalog loaded for guild ${interaction.guild!.id}: ${result.added} added, ${result.skipped} skipped`);
}

/**
 * Handle catalogo-ver subcommand
 */
async function handleCatalogView(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  shopService: ShopService
): Promise<void> {
  await interaction.deferReply();

  const rarity = interaction.options.getString('rareza') || undefined;
  const type = interaction.options.getString('tipo') || undefined;

  // Get total count
  const totalItems = db.countItemsByFilters({
    guildId: interaction.guild!.id,
    rarity,
    type
  });

  if (totalItems === 0) {
    await interaction.editReply({
      content: '📚 No hay ítems en el catálogo con esos filtros.\nUsa `/tienda catalogo-cargar` para cargar ítems del SDR.'
    });
    return;
  }

  // Show first page
  await showCatalogPage(interaction, db, shopService, 1, rarity, type, totalItems);
}

/**
 * Show a specific page of the catalog
 */
async function showCatalogPage(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  shopService: ShopService,
  page: number,
  rarity?: string,
  type?: string,
  totalItems?: number
): Promise<void> {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Get items for this page
  const items = db.getItemsByFilters({
    guildId: interaction.guild!.id,
    rarity,
    type,
    limit: ITEMS_PER_PAGE,
    offset
  });

  // Get pagination info
  const total = totalItems || db.countItemsByFilters({
    guildId: interaction.guild!.id,
    rarity,
    type
  });
  const paginationInfo = shopService.getPaginationInfo(total, page, ITEMS_PER_PAGE);

  // Build embed with dynamic color
  const embedColor = getAverageColor(items);
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle('📚 Catálogo de Ítems Mágicos')
    .setDescription(buildFilterDescription(rarity, type))
    .setFooter({
      text: `Página ${paginationInfo.currentPage} de ${paginationInfo.totalPages} • ${paginationInfo.totalItems} ítems en total`
    })
    .setTimestamp();

  // Add items as fields with improved formatting
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
    const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];

    let itemValue = `${rarityEmoji} **${item.rarity}** • ${typeEmoji} *${item.type}* • 💰 **${item.base_price} po**`;

    if (item.description) {
      const truncatedDesc = item.description.length > 100
        ? item.description.substring(0, 100) + '...'
        : item.description;
      itemValue += `\n\n*${truncatedDesc}*`;
    }

    // Add padding between items (except for the last one)
    if (i < items.length - 1) {
      itemValue += `\n\u200B`; // Zero-width space for vertical padding
    }

    embed.addFields({
      name: `${typeEmoji} ${item.name} ─ ID: ${item.id}`,
      value: itemValue,
      inline: false
    });
  }

  // Create pagination buttons
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('catalog_prev')
        .setLabel('◀ Anterior')
        .setStyle(ButtonStyle.Primary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('catalog_page')
      .setLabel(`${page}/${paginationInfo.totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  if (page < paginationInfo.totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('catalog_next')
        .setLabel('Siguiente ▶')
        .setStyle(ButtonStyle.Primary)
    );
  }

  const message = await interaction.editReply({
    embeds: [embed],
    components: paginationInfo.totalPages > 1 ? [row] : []
  });

  // Set up collector if there are multiple pages
  if (paginationInfo.totalPages > 1) {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: PAGINATION_TIMEOUT
    });

    let currentPage = page;

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: '❌ No puedes interactuar con este comando.',
          ephemeral: true
        });
        return;
      }

      if (buttonInteraction.customId === 'catalog_prev') {
        currentPage = Math.max(1, currentPage - 1);
      } else if (buttonInteraction.customId === 'catalog_next') {
        currentPage = Math.min(paginationInfo.totalPages, currentPage + 1);
      }

      await buttonInteraction.deferUpdate();

      // Re-fetch items for new page
      const newOffset = (currentPage - 1) * ITEMS_PER_PAGE;
      const newItems = db.getItemsByFilters({
        guildId: interaction.guild!.id,
        rarity,
        type,
        limit: ITEMS_PER_PAGE,
        offset: newOffset
      });

      // Update embed with dynamic color
      const newEmbedColor = getAverageColor(newItems);
      const newEmbed = new EmbedBuilder()
        .setColor(newEmbedColor)
        .setTitle('📚 Catálogo de Ítems Mágicos')
        .setDescription(buildFilterDescription(rarity, type))
        .setFooter({
          text: `Página ${currentPage} de ${paginationInfo.totalPages} • ${paginationInfo.totalItems} ítems en total`
        })
        .setTimestamp();

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        if (!item) continue;

        const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
        const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];

        let itemValue = `${rarityEmoji} **${item.rarity}** • ${typeEmoji} *${item.type}* • 💰 **${item.base_price} po**`;

        if (item.description) {
          const truncatedDesc = item.description.length > 100
            ? item.description.substring(0, 100) + '...'
            : item.description;
          itemValue += `\n\n*${truncatedDesc}*`;
        }

        // Add padding between items (except for the last one)
        if (i < newItems.length - 1) {
          itemValue += `\n\u200B`; // Zero-width space for vertical padding
        }

        newEmbed.addFields({
          name: `${typeEmoji} ${item.name} ─ ID: ${item.id}`,
          value: itemValue,
          inline: false
        });
      }

      // Update buttons
      const newRow = new ActionRowBuilder<ButtonBuilder>();

      if (currentPage > 1) {
        newRow.addComponents(
          new ButtonBuilder()
            .setCustomId('catalog_prev')
            .setLabel('◀ Anterior')
            .setStyle(ButtonStyle.Primary)
        );
      }

      newRow.addComponents(
        new ButtonBuilder()
          .setCustomId('catalog_page')
          .setLabel(`${currentPage}/${paginationInfo.totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      if (currentPage < paginationInfo.totalPages) {
        newRow.addComponents(
          new ButtonBuilder()
            .setCustomId('catalog_next')
            .setLabel('Siguiente ▶')
            .setStyle(ButtonStyle.Primary)
        );
      }

      await buttonInteraction.editReply({
        embeds: [newEmbed],
        components: [newRow]
      });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (error) {
        // Ignore errors when editing expired messages
        logger.debug('Could not remove pagination buttons');
      }
    });
  }
}

/**
 * Build filter description for catalog view
 */
function buildFilterDescription(rarity?: string, type?: string): string {
  const filters: string[] = [];

  if (rarity) {
    const rarityEmoji = ShopTypes.RARITY_EMOJI[rarity as ShopTypes.ItemRarity] || '';
    filters.push(`${rarityEmoji} **${rarity}**`);
  }

  if (type) {
    const typeEmoji = ShopTypes.TYPE_EMOJI[type as ShopTypes.ItemType] || '';
    filters.push(`${typeEmoji} **${type}**`);
  }

  if (filters.length > 0) {
    return `🔍 **Filtros activos:** ${filters.join(' • ')}`;
  }

  return '📚 Mostrando todos los ítems del catálogo';
}

/**
 * Format item info for display in embeds
 */
function formatItemInfo(item: any): string {
  const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
  const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];

  let info = `┌─ **Detalles**\n`;
  info += `│ ${typeEmoji} **Tipo:** ${item.type}\n`;
  info += `│ ${rarityEmoji} **Rareza:** ${item.rarity}\n`;
  info += `│ 💰 **Precio:** ${item.base_price} po\n`;

  if (item.description) {
    const truncatedDesc = item.description.length > 150
      ? item.description.substring(0, 150) + '...'
      : item.description;
    info += `└─ 📝 *${truncatedDesc}*`;
  } else {
    info += `└─`;
  }

  return info;
}

/**
 * Get average rarity color for mixed items
 */
function getAverageColor(items: any[]): number {
  if (items.length === 0) return 0x0099ff;

  // If single item, use its rarity color
  if (items.length === 1) {
    return ShopTypes.RARITY_COLOR[items[0].rarity as ShopTypes.ItemRarity] || 0x0099ff;
  }

  // For multiple items, use a neutral blue
  return 0x0099ff;
}

/**
 * Handle catalogo-buscar subcommand
 */
async function handleCatalogSearch(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  shopService: ShopService
): Promise<void> {
  await interaction.deferReply();

  const query = interaction.options.getString('nombre', true);

  // Search items (using a simple LIKE query)
  const items = db.getItemsByFilters({
    guildId: interaction.guild!.id
  }).filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  if (items.length === 0) {
    await interaction.editReply({
      content: `🔍 No se encontraron ítems con el nombre "${query}".`
    });
    return;
  }

  // Show first 10 results
  const displayItems = items.slice(0, 10);

  const embedColor = getAverageColor(displayItems);
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🔍 Resultados de búsqueda: "${query}"`)
    .setDescription(`✨ Se encontraron **${items.length}** ítem(s) que coinciden`)
    .setTimestamp();

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i];
    if (!item) continue;

    const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
    const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];

    let itemValue = `${rarityEmoji} **${item.rarity}** • ${typeEmoji} *${item.type}* • 💰 **${item.base_price} po**`;

    if (item.description) {
      const truncatedDesc = item.description.length > 100
        ? item.description.substring(0, 100) + '...'
        : item.description;
      itemValue += `\n\n*${truncatedDesc}*`;
    }

    if (item.link) {
      itemValue += `\n🔗 [Ver detalles completos](${item.link})`;
    }

    // Add padding between items (except for the last one)
    if (i < displayItems.length - 1) {
      itemValue += `\n\u200B`; // Zero-width space for vertical padding
    }

    embed.addFields({
      name: `${typeEmoji} ${item.name} ─ ID: ${item.id}`,
      value: itemValue,
      inline: false
    });
  }

  if (items.length > 10) {
    embed.setFooter({ text: `📋 Mostrando 10 de ${items.length} resultados • Refina tu búsqueda para ver más` });
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle catalogo-agregar subcommand
 */
async function handleCatalogAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const modal = createAddItemModal();
  await interaction.showModal(modal);
}

/**
 * Handle catalogo-editar subcommand
 */
async function handleCatalogEdit(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const itemId = interaction.options.getInteger('id', true);

  // Get item
  const items = db.getItems(interaction.guild!.id);
  const item = items.find(i => i.id === itemId);

  if (!item) {
    await interaction.reply({
      content: `❌ No se encontró el ítem con ID ${itemId}.`,
      ephemeral: true
    });
    return;
  }

  const modal = createEditItemModal(item);
  await interaction.showModal(modal);
}

/**
 * Handle catalogo-eliminar subcommand
 */
async function handleCatalogDelete(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const itemId = interaction.options.getInteger('id', true);

  // Check if item exists
  const items = db.getItems(interaction.guild!.id);
  const item = items.find(i => i.id === itemId);

  if (!item) {
    await interaction.reply({
      content: `❌ No se encontró el ítem con ID ${itemId}.`,
      ephemeral: true
    });
    return;
  }

  // Delete item
  const deleted = db.deleteItem(itemId);

  if (!deleted) {
    await interaction.reply({
      content: '❌ Error al eliminar el ítem.',
      ephemeral: true
    });
    return;
  }

  const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
  const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];
  const rarityColor = ShopTypes.RARITY_COLOR[item.rarity as ShopTypes.ItemRarity];

  const embed = new EmbedBuilder()
    .setColor(rarityColor)
    .setTitle('🗑️ Ítem Eliminado del Catálogo')
    .setDescription(`El ítem **${item.name}** ha sido eliminado permanentemente.`)
    .addFields(
      { name: 'ID', value: `**${item.id}**`, inline: true },
      { name: 'Tipo', value: `${typeEmoji} ${item.type}`, inline: true },
      { name: 'Rareza', value: `${rarityEmoji} ${item.rarity}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Item ${itemId} deleted from catalog by ${interaction.user.username}`);
}

// ==================== INVENTORY HANDLERS ====================

/**
 * Handle inventario-ver subcommand
 */
async function handleInventoryView(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  shopService: ShopService
): Promise<void> {
  await interaction.deferReply();

  const inventory = db.getCurrentInventory(interaction.guild!.id);

  if (inventory.length === 0) {
    await interaction.editReply({
      content: '🏪 La tienda está vacía actualmente.\nLos administradores pueden agregar ítems con `/tienda inventario-agregar`.'
    });
    return;
  }

  // Get shop config for footer info
  const config = db.getOrCreateShopConfig(interaction.guild!.id);

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏪 Inventario de la Tienda')
    .setDescription(`✨ **${inventory.length}** ítem(s) mágico(s) disponible(s) para adquirir`)
    .setTimestamp()
    .setFooter({ text: `Capacidad: ${inventory.length}/${config.max_items} ítems` });

  for (let i = 0; i < inventory.length; i++) {
    const inv = inventory[i];
    if (!inv) continue;

    const typeEmoji = ShopTypes.TYPE_EMOJI[inv.item.type as ShopTypes.ItemType];
    const rarityEmoji = ShopTypes.RARITY_EMOJI[inv.item.rarity as ShopTypes.ItemRarity];
    const stockText = inv.stock === null ? '∞' : `${inv.stock}`;
    const variance = shopService.calculateVariancePercent(inv.current_price, inv.item.base_price);

    let itemValue = `┌─ **Información**\n`;
    itemValue += `│ ${rarityEmoji} **Rareza:** ${inv.item.rarity}\n`;
    itemValue += `│ 💰 **Precio:** ${inv.current_price} po *(base: ${inv.item.base_price} po, ${variance})*\n`;
    itemValue += `│ 📊 **Stock:** ${stockText} ${inv.stock === null ? 'unidades ilimitadas' : 'unidades'}`;

    if (inv.item.description) {
      const truncatedDesc = inv.item.description.length > 120
        ? inv.item.description.substring(0, 120) + '...'
        : inv.item.description;
      itemValue += `\n└─ 📝 *${truncatedDesc}*`;
    } else {
      itemValue += `\n└─`;
    }

    if (inv.item.link) {
      itemValue += `\n\n🔗 [Ver detalles completos](${inv.item.link})`;
    }

    // Add padding between items (except for the last one)
    if (i < inventory.length - 1) {
      itemValue += `\n\u200B`; // Zero-width space for vertical padding
    }

    embed.addFields({
      name: `${typeEmoji} ${inv.item.name} ─ ID: ${inv.id}`,
      value: itemValue,
      inline: false
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle inventario-agregar subcommand
 */
async function handleInventoryAdd(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService,
  shopService: ShopService
): Promise<void> {
  const itemId = interaction.options.getInteger('item_id', true);
  const stock = interaction.options.getInteger('stock');

  // Get item from catalog
  const items = db.getItems(interaction.guild!.id);
  const item = items.find(i => i.id === itemId);

  if (!item) {
    await interaction.reply({
      content: `❌ No se encontró el ítem con ID ${itemId} en el catálogo.`,
      ephemeral: true
    });
    return;
  }

  // Get shop config
  const config = db.getOrCreateShopConfig(interaction.guild!.id);

  // Check if we're at capacity
  const currentInventory = db.getCurrentInventory(interaction.guild!.id);
  if (currentInventory.length >= config.max_items) {
    await interaction.reply({
      content: `❌ El inventario está lleno (${config.max_items} ítems máximo).\nQuita un ítem o aumenta la capacidad con \`/tienda config-capacidad\`.`,
      ephemeral: true
    });
    return;
  }

  // Apply price variance
  const currentPrice = shopService.applyPriceVariance(item.base_price, config);

  // Add to inventory
  const inventoryItem = db.addToInventory({
    guild_id: interaction.guild!.id,
    item_id: itemId,
    current_price: currentPrice,
    stock: stock,
    is_available: true
  });

  // Record transaction
  db.recordTransaction({
    guild_id: interaction.guild!.id,
    inventory_id: inventoryItem.id,
    action: 'added',
    quantity: stock !== null ? stock : 1,
    price: currentPrice,
    performed_by: interaction.user.id
  });

  const variance = shopService.calculateVariancePercent(currentPrice, item.base_price);
  const stockText = stock === null ? '∞ unidades (ilimitado)' : `${stock} unidades`;
  const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType];
  const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity];
  const rarityColor = ShopTypes.RARITY_COLOR[item.rarity as ShopTypes.ItemRarity];

  const embed = new EmbedBuilder()
    .setColor(rarityColor)
    .setTitle('✅ Ítem Agregado al Inventario')
    .setDescription(`${typeEmoji} **${item.name}** ahora está disponible en la tienda.`)
    .addFields(
      { name: '💰 Precio Base', value: `**${item.base_price} po**`, inline: true },
      { name: '🏷️ Precio en Tienda', value: `**${currentPrice} po**\n*${variance}*`, inline: true },
      { name: '📊 Stock', value: stockText, inline: true },
      { name: '⚔️ Tipo', value: `${typeEmoji} ${item.type}`, inline: true },
      { name: '✨ Rareza', value: `${rarityEmoji} ${item.rarity}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Item ${itemId} added to inventory for guild ${interaction.guild!.id}`);
}

/**
 * Handle inventario-quitar subcommand
 */
async function handleInventoryRemove(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const invId = interaction.options.getInteger('id', true);

  // Get inventory item
  const inventory = db.getCurrentInventory(interaction.guild!.id);
  const invItem = inventory.find(i => i.id === invId);

  if (!invItem) {
    await interaction.reply({
      content: `❌ No se encontró el ítem con ID ${invId} en el inventario.`,
      ephemeral: true
    });
    return;
  }

  // Remove from inventory
  const removed = db.removeFromInventory(invId);

  if (!removed) {
    await interaction.reply({
      content: '❌ Error al quitar el ítem del inventario.',
      ephemeral: true
    });
    return;
  }

  // Record transaction
  db.recordTransaction({
    guild_id: interaction.guild!.id,
    inventory_id: invId,
    action: 'removed',
    quantity: 1,
    price: invItem.current_price,
    performed_by: interaction.user.id
  });

  const typeEmoji = ShopTypes.TYPE_EMOJI[invItem.item.type as ShopTypes.ItemType];
  const rarityEmoji = ShopTypes.RARITY_EMOJI[invItem.item.rarity as ShopTypes.ItemRarity];
  const rarityColor = ShopTypes.RARITY_COLOR[invItem.item.rarity as ShopTypes.ItemRarity];

  const embed = new EmbedBuilder()
    .setColor(rarityColor)
    .setTitle('🗑️ Ítem Removido del Inventario')
    .setDescription(`${typeEmoji} **${invItem.item.name}** ya no está disponible en la tienda.`)
    .addFields(
      { name: '💰 Precio', value: `**${invItem.current_price} po**`, inline: true },
      { name: '📊 Stock Final', value: invItem.stock === null ? '∞ Ilimitado' : `**${invItem.stock}** unidades`, inline: true },
      { name: '✨ Rareza', value: `${rarityEmoji} ${invItem.item.rarity}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Item ${invId} removed from inventory for guild ${interaction.guild!.id}`);
}

/**
 * Handle inventario-stock subcommand
 */
async function handleInventoryStock(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const invId = interaction.options.getInteger('id', true);
  const cantidad = interaction.options.getInteger('cantidad', true);

  // Get inventory item
  const inventory = db.getCurrentInventory(interaction.guild!.id);
  const invItem = inventory.find(i => i.id === invId);

  if (!invItem) {
    await interaction.reply({
      content: `❌ No se encontró el ítem con ID ${invId} en el inventario.`,
      ephemeral: true
    });
    return;
  }

  // Update stock (0 = unlimited = null)
  const newStock = cantidad === 0 ? null : cantidad;
  const updated = db.updateInventoryStock(invId, newStock);

  if (!updated) {
    await interaction.reply({
      content: '❌ Error al actualizar el stock.',
      ephemeral: true
    });
    return;
  }

  // Record transaction
  db.recordTransaction({
    guild_id: interaction.guild!.id,
    inventory_id: invId,
    action: 'restocked',
    quantity: cantidad,
    price: null,
    performed_by: interaction.user.id
  });

  const oldStockText = invItem.stock === null ? '∞ ilimitado' : `**${invItem.stock}** unidades`;
  const newStockText = newStock === null ? '∞ ilimitado' : `**${newStock}** unidades`;
  const typeEmoji = ShopTypes.TYPE_EMOJI[invItem.item.type as ShopTypes.ItemType];
  const rarityColor = ShopTypes.RARITY_COLOR[invItem.item.rarity as ShopTypes.ItemRarity];

  const embed = new EmbedBuilder()
    .setColor(rarityColor)
    .setTitle('📊 Stock Actualizado')
    .setDescription(`${typeEmoji} El stock de **${invItem.item.name}** ha sido actualizado.`)
    .addFields(
      { name: '📦 Stock Anterior', value: oldStockText, inline: true },
      { name: '✅ Stock Nuevo', value: newStockText, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Stock updated for inventory item ${invId} in guild ${interaction.guild!.id}`);
}

// ==================== CONFIG HANDLERS ====================

/**
 * Handle config-ver subcommand
 */
async function handleConfigView(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const config = db.getOrCreateShopConfig(interaction.guild!.id);

  const minPercent = (config.price_variance_min * 100).toFixed(0);
  const maxPercent = (config.price_variance_max * 100).toFixed(0);

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('⚙️ Configuración de la Tienda')
    .addFields(
      {
        name: '💰 Varianza de Precios',
        value: `Rango: ${minPercent}% - ${maxPercent}%\n(${config.price_variance_min}x - ${config.price_variance_max}x del precio base)`,
        inline: false
      },
      {
        name: '📦 Capacidad del Inventario',
        value: `Máximo ${config.max_items} ítems`,
        inline: true
      },
      {
        name: '🔄 Frecuencia de Rotación',
        value: config.rotation_frequency || 'No configurada',
        inline: true
      }
    )
    .setTimestamp();

  if (config.last_rotation) {
    const lastRotation = new Date(config.last_rotation * 1000);
    embed.addFields({
      name: '🕐 Última Rotación',
      value: `<t:${config.last_rotation}:R>`,
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle config-varianza subcommand
 */
async function handleConfigVariance(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const min = interaction.options.getNumber('min', true);
  const max = interaction.options.getNumber('max', true);

  // Validate
  if (min >= max) {
    await interaction.reply({
      content: '❌ El valor mínimo debe ser menor que el máximo.',
      ephemeral: true
    });
    return;
  }

  // Update config
  const updated = db.updateShopConfig(interaction.guild!.id, {
    price_variance_min: min,
    price_variance_max: max
  });

  if (!updated) {
    await interaction.reply({
      content: '❌ Error al actualizar la configuración.',
      ephemeral: true
    });
    return;
  }

  const minPercent = (min * 100).toFixed(0);
  const maxPercent = (max * 100).toFixed(0);

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Varianza de Precios Actualizada')
    .setDescription('🎲 Los nuevos ítems agregados al inventario usarán este rango de varianza.')
    .addFields(
      { name: '📊 Rango Nuevo', value: `**${minPercent}% - ${maxPercent}%**\n*${min}x - ${max}x del precio base*`, inline: false }
    )
    .setFooter({ text: 'ℹ️ Nota: Los ítems ya en inventario mantienen su precio actual' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  logger.info(`Variance config updated for guild ${interaction.guild!.id}: ${min}-${max}`);
}

/**
 * Handle config-capacidad subcommand
 */
async function handleConfigCapacity(
  interaction: ChatInputCommandInteraction,
  db: DatabaseService
): Promise<void> {
  const maxItems = interaction.options.getInteger('max', true);

  // Update config
  const updated = db.updateShopConfig(interaction.guild!.id, {
    max_items: maxItems
  });

  if (!updated) {
    await interaction.reply({
      content: '❌ Error al actualizar la configuración.',
      ephemeral: true
    });
    return;
  }

  const currentInventory = db.getCurrentInventory(interaction.guild!.id);

  const embed = new EmbedBuilder()
    .setColor(currentInventory.length > maxItems ? 0xff9900 : 0x00ff00)
    .setTitle('✅ Capacidad del Inventario Actualizada')
    .setDescription(`📦 La tienda ahora puede contener hasta **${maxItems}** ítems mágicos.`)
    .addFields(
      { name: '📋 Ítems Actuales', value: `**${currentInventory.length}**`, inline: true },
      { name: '📦 Capacidad Máxima', value: `**${maxItems}**`, inline: true }
    )
    .setTimestamp();

  if (currentInventory.length > maxItems) {
    embed.setFooter({
      text: `⚠️ Advertencia: Actualmente tienes ${currentInventory.length} ítems, excediendo el límite de ${maxItems}. Considera quitar algunos.`
    });
  }

  await interaction.reply({ embeds: [embed] });
  logger.info(`Capacity config updated for guild ${interaction.guild!.id}: ${maxItems}`);
}
