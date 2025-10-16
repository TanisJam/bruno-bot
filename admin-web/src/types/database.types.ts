// Database types (shared with main bot)
export interface Guild {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface Reminder {
  id: number;
  guild_id: string;
  channel_id: string;
  message: string;
  day_of_week: number;
  time: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface WeatherCondition {
  id: number;
  guild_id: string;
  name: string;
  description: string;
  effects: string;
  probability: number;
  created_at: number;
  updated_at: number;
}

export interface WeatherHistory {
  id: number;
  guild_id: string;
  condition_id: number;
  posted_at: number;
}

export interface ItemCatalog {
  id: number;
  guild_id: string | null;
  link: string | null;
  name: string;
  description: string | null;
  type: string | null;
  rarity: string | null;
  base_price: number;
  created_at: number;
  updated_at: number;
}

export interface ShopInventory {
  id: number;
  guild_id: string;
  item_id: number;
  current_price: number;
  stock: number | null;
  is_available: boolean;
  added_at: number;
  removed_at: number | null;
}

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

export interface DashboardStats {
  guilds: number;
  reminders: number;
  activeReminders: number;
  items: number;
  inventoryItems: number;
}