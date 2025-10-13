-- Bruno Bot Database Schema
-- SQLite Database for D&D Campaign Management

-- Guild Configuration
-- Stores per-guild settings
CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Weekly Reminders
-- Stores scheduled reminders for game sessions
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  time TEXT NOT NULL, -- Format: HH:MM (24-hour)
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Weather Definitions
-- Master table of all possible weather conditions per guild
CREATE TABLE IF NOT EXISTS weather_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g., "Tormenta Feroz", "Día Soleado"
  description TEXT NOT NULL, -- Description of the weather itself
  effects TEXT NOT NULL, -- Description of mechanical/narrative effects
  probability REAL NOT NULL CHECK(probability > 0 AND probability <= 100), -- Probability weight (0-100)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Weather History
-- Tracks which weather was posted and when
CREATE TABLE IF NOT EXISTS weather_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  condition_id INTEGER NOT NULL,
  posted_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  FOREIGN KEY (condition_id) REFERENCES weather_conditions(id) ON DELETE CASCADE
);

-- Item Catalog
-- Master catalog of ALL available items (shared across guilds or per-guild)
CREATE TABLE IF NOT EXISTS item_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT, -- NULL = global item, otherwise guild-specific
  link TEXT, -- Link to item reference (e.g., D&D Beyond)
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- weapon, armor, potion, wondrous, scroll, etc.
  rarity TEXT, -- common, uncommon, rare, very rare, legendary, artifact
  base_price INTEGER NOT NULL, -- Base price in gold pieces
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Shop Configuration
-- Settings for how the shop rotation works per guild
CREATE TABLE IF NOT EXISTS shop_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL UNIQUE,
  rotation_frequency TEXT NOT NULL DEFAULT 'weekly', -- weekly, biweekly, monthly
  max_items INTEGER NOT NULL DEFAULT 10, -- Max items in rotation
  price_variance_min REAL NOT NULL DEFAULT 0.8, -- Min price multiplier (80%)
  price_variance_max REAL NOT NULL DEFAULT 1.2, -- Max price multiplier (120%)
  rarity_weights TEXT, -- JSON with rarity probability weights
  type_weights TEXT, -- JSON with item type probability weights
  last_rotation INTEGER, -- Timestamp of last rotation
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Shop Inventory
-- Current items in stock for each guild's shop
CREATE TABLE IF NOT EXISTS shop_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  current_price INTEGER NOT NULL, -- Price with variance applied
  stock INTEGER, -- NULL = unlimited, otherwise specific quantity
  is_available BOOLEAN NOT NULL DEFAULT 1,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  removed_at INTEGER, -- When item was removed from rotation
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES item_catalog(id) ON DELETE CASCADE
);

-- Shop Transaction History
-- Tracks sales and inventory changes
CREATE TABLE IF NOT EXISTS shop_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  inventory_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('added', 'removed', 'sold', 'restocked')),
  quantity INTEGER DEFAULT 1,
  price INTEGER, -- Price at time of transaction
  performed_by TEXT, -- User ID who performed the action
  performed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_id) REFERENCES shop_inventory(id) ON DELETE CASCADE
);

-- Database Metadata
-- Tracks schema version for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (1);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_guild_id ON reminders(guild_id);
CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_weather_conditions_guild_id ON weather_conditions(guild_id);
CREATE INDEX IF NOT EXISTS idx_weather_history_guild_id ON weather_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_item_catalog_guild_id ON item_catalog(guild_id);
CREATE INDEX IF NOT EXISTS idx_item_catalog_rarity ON item_catalog(rarity);
CREATE INDEX IF NOT EXISTS idx_item_catalog_type ON item_catalog(type);
CREATE INDEX IF NOT EXISTS idx_shop_inventory_guild_id ON shop_inventory(guild_id);
CREATE INDEX IF NOT EXISTS idx_shop_inventory_available ON shop_inventory(is_available);
CREATE INDEX IF NOT EXISTS idx_shop_transactions_guild_id ON shop_transactions(guild_id);
