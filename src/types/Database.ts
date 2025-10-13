/**
 * Database type definitions for Bruno Bot
 */

// Guild Configuration
export interface Guild {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

// Weekly Reminders
export interface Reminder {
  id: number;
  guild_id: string;
  channel_id: string;
  message: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  time: string; // Format: HH:MM
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

// Weather System
export interface WeatherCondition {
  id: number;
  guild_id: string;
  name: string;
  description: string;
  effects: string;
  probability: number; // 0-100
  created_at: number;
  updated_at: number;
}

export interface WeatherHistory {
  id: number;
  guild_id: string;
  condition_id: number;
  posted_at: number;
}

// Item Catalog
export interface ItemCatalog {
  id: number;
  guild_id: string | null; // null = global item
  link: string | null;
  name: string;
  description: string | null;
  type: string; // weapon, armor, potion, wondrous, scroll, etc.
  rarity: string; // common, uncommon, rare, very rare, legendary, artifact
  base_price: number;
  created_at: number;
  updated_at: number;
}

// Shop Configuration
export interface ShopConfig {
  id: number;
  guild_id: string;
  rotation_frequency: 'weekly' | 'biweekly' | 'monthly';
  max_items: number;
  price_variance_min: number; // e.g., 0.8 for 80%
  price_variance_max: number; // e.g., 1.2 for 120%
  rarity_weights: string | null; // JSON string
  type_weights: string | null; // JSON string
  last_rotation: number | null;
  created_at: number;
  updated_at: number;
}

export interface RarityWeights {
  common?: number;
  uncommon?: number;
  rare?: number;
  'very rare'?: number;
  legendary?: number;
  artifact?: number;
}

export interface TypeWeights {
  weapon?: number;
  armor?: number;
  potion?: number;
  scroll?: number;
  wondrous?: number;
  misc?: number;
}

// Shop Inventory
export interface ShopInventory {
  id: number;
  guild_id: string;
  item_id: number;
  current_price: number;
  stock: number | null; // null = unlimited
  is_available: boolean;
  added_at: number;
  removed_at: number | null;
}

// Shop Transactions
export interface ShopTransaction {
  id: number;
  guild_id: string;
  inventory_id: number;
  action: 'added' | 'removed' | 'sold' | 'restocked';
  quantity: number;
  price: number | null;
  performed_by: string | null;
  performed_at: number;
}

// Database schema version
export interface SchemaVersion {
  version: number;
  applied_at: number;
}

// Extended types with joined data
export interface ShopInventoryWithItem extends ShopInventory {
  item: ItemCatalog;
}

export interface WeatherHistoryWithCondition extends WeatherHistory {
  condition: WeatherCondition;
}
