/**
 * Shop-specific types and constants for Bruno Bot
 */

// Item types
export const ITEM_TYPES = ['weapon', 'armor', 'potion', 'scroll', 'wondrous', 'misc'] as const;
export type ItemType = typeof ITEM_TYPES[number];

// Item rarities
export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'] as const;
export type ItemRarity = typeof ITEM_RARITIES[number];

// Rarity emoji mapping for display
export const RARITY_EMOJI: Record<ItemRarity, string> = {
  'common': '⚪',
  'uncommon': '🟢',
  'rare': '🔵',
  'very rare': '🟣',
  'legendary': '🟠',
  'artifact': '🔴'
};

// Rarity color mapping for embeds (hex colors)
export const RARITY_COLOR: Record<ItemRarity, number> = {
  'common': 0x9d9d9d,      // Gray
  'uncommon': 0x1eff00,    // Green
  'rare': 0x0070dd,        // Blue
  'very rare': 0xa335ee,   // Purple
  'legendary': 0xff8000,   // Orange
  'artifact': 0xe6cc80     // Gold
};

// Type emoji mapping for display
export const TYPE_EMOJI: Record<ItemType, string> = {
  'weapon': '⚔️',
  'armor': '🛡️',
  'potion': '🧪',
  'scroll': '📜',
  'wondrous': '✨',
  'misc': '📦'
};

// SDR file configuration
export interface SDRFile {
  filename: string;
  rarity: ItemRarity;
}

export const SDR_FILES: SDRFile[] = [
  { filename: 'common.json', rarity: 'common' },
  { filename: 'uncommon.json', rarity: 'uncommon' },
  { filename: 'rare.json', rarity: 'rare' },
  { filename: 'potions.json', rarity: 'common' }
];

// JSON item structure from SDR files
export interface SDRItemJSON {
  name: string;
  price: string;
  link?: string;
}

// Result of loading SDR items
export interface LoadResult {
  added: number;
  skipped: number;
}

// Pagination info
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

// Type inference keywords
export const TYPE_KEYWORDS: Record<ItemType, RegExp> = {
  'weapon': /(sword|axe|bow|dagger|mace|hammer|weapon|blade|staff|wand|rod|spear|lance|crossbow|javelin|club|flail)/i,
  'armor': /(armor|shield|helmet|gauntlet|boots|cloak|plate|mail|leather|hide|breastplate)/i,
  'potion': /(potion|elixir|tonic|draught|oil|philter)/i,
  'scroll': /(scroll|spell scroll|parchment)/i,
  'wondrous': /(ring|amulet|necklace|bracelet|gem|orb|crystal|pearl|stone|belt|hat|robe|gloves|bag|bottle|deck|horn|instrument|mirror|rope|carpet)/i,
  'misc': /.*/
};
