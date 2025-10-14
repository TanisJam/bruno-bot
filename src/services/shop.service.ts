import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from './database.service';
import { logger } from '../utils/logger';
import * as ShopTypes from '../types/Shop';
import * as DBTypes from '../types/Database';

/**
 * Shop service for managing item catalog and inventory
 */
export class ShopService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Load items from SDR JSON files
   * Does NOT overwrite existing items with the same name
   */
  public async loadSDRItems(guildId?: string): Promise<ShopTypes.LoadResult> {
    let added = 0;
    let skipped = 0;

    logger.info('🔄 Starting SDR items load...');

    for (const sdrFile of ShopTypes.SDR_FILES) {
      try {
        const filePath = join(process.cwd(), 'sdr', sdrFile.filename);
        logger.debug(`Reading file: ${filePath}`);

        const fileContent = readFileSync(filePath, 'utf-8');
        const items: ShopTypes.SDRItemJSON[] = JSON.parse(fileContent);

        logger.info(`📄 Processing ${items.length} items from ${sdrFile.filename}`);

        for (const item of items) {
          // Check if item already exists by name
          const existing = this.db.getItemByName(item.name, guildId);

          if (existing) {
            logger.debug(`⏭️  Skipping "${item.name}" - already exists`);
            skipped++;
            continue;
          }

          // Infer type from item name
          const type = this.inferTypeFromName(item.name);

          // Parse price (handle both string and number)
          const basePrice = parseInt(item.price.toString());

          // Create item in catalog
          this.db.createItem({
            guild_id: guildId || null, // null = global item
            name: item.name,
            link: item.link || null,
            type: type,
            rarity: sdrFile.rarity,
            base_price: basePrice,
            description: null
          });

          logger.debug(`✅ Added "${item.name}" (${type}, ${sdrFile.rarity}, ${basePrice} po)`);
          added++;
        }
      } catch (error) {
        logger.error(`❌ Error loading ${sdrFile.filename}:`, error);
        // Continue with other files
      }
    }

    logger.info(`✅ SDR load complete: ${added} added, ${skipped} skipped`);

    return { added, skipped };
  }

  /**
   * Infer item type from name using keyword matching
   */
  private inferTypeFromName(name: string): ShopTypes.ItemType {
    const nameLower = name.toLowerCase();

    // Try each type in priority order
    for (const [type, regex] of Object.entries(ShopTypes.TYPE_KEYWORDS)) {
      if (type === 'misc') continue; // Skip misc for now (it's the fallback)

      if (regex.test(nameLower)) {
        return type as ShopTypes.ItemType;
      }
    }

    // Default to wondrous if no match
    return 'wondrous';
  }

  /**
   * Apply price variance when adding item to inventory
   * Uses shop config's min/max variance settings
   */
  public applyPriceVariance(basePrice: number, config: DBTypes.ShopConfig): number {
    const min = config.price_variance_min;
    const max = config.price_variance_max;

    // Generate random multiplier between min and max
    const multiplier = min + Math.random() * (max - min);

    // Apply and round down
    return Math.floor(basePrice * multiplier);
  }

  /**
   * Calculate variance percentage for display
   */
  public calculateVariancePercent(currentPrice: number, basePrice: number): string {
    const variance = ((currentPrice - basePrice) / basePrice) * 100;
    const sign = variance >= 0 ? '+' : '';
    return `${sign}${variance.toFixed(1)}%`;
  }

  /**
   * Format item display string
   */
  public formatItemDisplay(item: DBTypes.ItemCatalog): string {
    const typeEmoji = ShopTypes.TYPE_EMOJI[item.type as ShopTypes.ItemType] || '📦';
    const rarityEmoji = ShopTypes.RARITY_EMOJI[item.rarity as ShopTypes.ItemRarity] || '⚪';

    return `${typeEmoji} **${item.name}**\n${rarityEmoji} ${item.rarity} | 💰 ${item.base_price} po`;
  }

  /**
   * Format inventory item display string
   */
  public formatInventoryDisplay(inv: DBTypes.ShopInventoryWithItem): string {
    const typeEmoji = ShopTypes.TYPE_EMOJI[inv.item.type as ShopTypes.ItemType] || '📦';
    const rarityEmoji = ShopTypes.RARITY_EMOJI[inv.item.rarity as ShopTypes.ItemRarity] || '⚪';
    const stockText = inv.stock === null ? '∞ (ilimitado)' : `${inv.stock} unidades`;
    const variance = this.calculateVariancePercent(inv.current_price, inv.item.base_price);

    return `${typeEmoji} **${inv.item.name}**
${rarityEmoji} ${inv.item.rarity} | 💰 ${inv.current_price} po (base: ${inv.item.base_price} po, ${variance})
📊 Stock: ${stockText}`;
  }

  /**
   * Validate item type
   */
  public isValidType(type: string): type is ShopTypes.ItemType {
    return ShopTypes.ITEM_TYPES.includes(type as ShopTypes.ItemType);
  }

  /**
   * Validate item rarity
   */
  public isValidRarity(rarity: string): rarity is ShopTypes.ItemRarity {
    return ShopTypes.ITEM_RARITIES.includes(rarity as ShopTypes.ItemRarity);
  }

  /**
   * Get pagination info
   */
  public getPaginationInfo(totalItems: number, currentPage: number, itemsPerPage: number): ShopTypes.PaginationInfo {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      currentPage,
      totalPages,
      itemsPerPage,
      totalItems
    };
  }
}
