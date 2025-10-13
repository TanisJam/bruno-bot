# Database - Bruno Bot

This document describes the SQLite persistence implementation in Bruno Bot.

## 📋 Overview

Bruno Bot uses **SQLite** with the `better-sqlite3` library to persist configuration data, reminders, weather conditions, and shop inventory.

## 🗄️ Database Schema

### Core Tables

#### `guilds`
Stores configuration for each Discord server.
```sql
- id: TEXT (Discord Guild ID)
- name: TEXT (Server name)
- created_at: INTEGER (Unix timestamp)
- updated_at: INTEGER (Unix timestamp)
```

#### `reminders`
Weekly reminders for game sessions.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds)
- channel_id: TEXT (Discord Channel ID)
- message: TEXT (Reminder message)
- day_of_week: INTEGER (0=Sunday, 6=Saturday)
- time: TEXT (Format: HH:MM in 24-hour)
- enabled: BOOLEAN
```

#### `weather_conditions`
Configurable weather conditions per server.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds)
- name: TEXT (Weather name)
- description: TEXT (Narrative description)
- effects: TEXT (Mechanical effects)
- probability: REAL (Probability weight 0-100)
```

#### `weather_history`
History of posted weather conditions.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds)
- condition_id: INTEGER (FK -> weather_conditions)
- posted_at: INTEGER (Unix timestamp)
```

#### `item_catalog`
Master catalog of all available items.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (NULL = global item, otherwise guild-specific)
- link: TEXT (Link to item reference)
- name: TEXT (Item name)
- description: TEXT (Description)
- type: TEXT (weapon, armor, potion, wondrous, scroll, etc.)
- rarity: TEXT (common, uncommon, rare, very rare, legendary, artifact)
- base_price: INTEGER (Base price in gold pieces)
```

#### `shop_config`
Shop configuration per server.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds, UNIQUE)
- rotation_frequency: TEXT (weekly, biweekly, monthly)
- max_items: INTEGER (Maximum items in rotation)
- price_variance_min: REAL (Minimum multiplier, e.g., 0.8 = 80%)
- price_variance_max: REAL (Maximum multiplier, e.g., 1.2 = 120%)
- rarity_weights: TEXT (JSON with rarity probability weights)
- type_weights: TEXT (JSON with item type probability weights)
- last_rotation: INTEGER (Timestamp of last rotation)
```

#### `shop_inventory`
Current shop inventory for the server.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds)
- item_id: INTEGER (FK -> item_catalog)
- current_price: INTEGER (Price with variance applied)
- stock: INTEGER (NULL = unlimited, or specific quantity)
- is_available: BOOLEAN
- added_at: INTEGER (Unix timestamp)
- removed_at: INTEGER (When removed from rotation)
```

#### `shop_transactions`
Shop transaction history.
```sql
- id: INTEGER (Auto-increment)
- guild_id: TEXT (FK -> guilds)
- inventory_id: INTEGER (FK -> shop_inventory)
- action: TEXT (added, removed, sold, restocked)
- quantity: INTEGER
- price: INTEGER (Price at transaction time)
- performed_by: TEXT (Discord User ID)
- performed_at: INTEGER (Unix timestamp)
```

## 🔧 Using the Database Service

### Initialization

The service initializes automatically on bot startup:

```typescript
import { DatabaseService } from './services/database.service';
import config from './config';

const db = DatabaseService.getInstance(config.DB_PATH);
```

### Basic Operations

#### Guilds
```typescript
// Ensure guild exists
const guild = db.ensureGuild(guildId, guildName);

// Get a guild
const guild = db.getGuild(guildId);
```

#### Reminders
```typescript
// Create reminder
const reminder = db.createReminder({
  guild_id: guildId,
  channel_id: channelId,
  message: 'Game session in 1 hour! 🎲',
  day_of_week: 5, // Friday
  time: '19:00',
  enabled: true
});

// Get enabled reminders
const reminders = db.getEnabledReminders(guildId);

// Update reminder
db.updateReminder(reminderId, { time: '20:00' });

// Delete reminder
db.deleteReminder(reminderId);
```

#### Weather
```typescript
// Create weather condition
const weather = db.createWeatherCondition({
  guild_id: guildId,
  name: 'Fierce Storm',
  description: 'A thunderstorm strikes the region',
  effects: 'Disadvantage on Perception (sight)',
  probability: 20 // 20% probability
});

// Get all conditions
const conditions = db.getWeatherConditions(guildId);

// Get random weather (probability-weighted)
const randomWeather = db.getRandomWeatherCondition(guildId);

// Record in history
db.recordWeatherHistory(guildId, weather.id);
```

#### Items and Shop
```typescript
// Create item in catalog
const item = db.createItem({
  guild_id: guildId,
  link: 'https://www.dndbeyond.com/...',
  name: 'Potion of Healing',
  description: 'Restores 2d4+2 HP',
  type: 'potion',
  rarity: 'common',
  base_price: 50
});

// Get available items
const items = db.getItems(guildId);

// Configure shop
const shopConfig = db.getOrCreateShopConfig(guildId);
db.updateShopConfig(guildId, {
  max_items: 15,
  rotation_frequency: 'weekly'
});

// Add item to inventory
const inventory = db.addToInventory({
  guild_id: guildId,
  item_id: item.id,
  current_price: 45, // 10% discount
  stock: 5,
  is_available: true
});

// View current inventory
const currentInventory = db.getCurrentInventory(guildId);

// Record transaction
db.recordTransaction({
  guild_id: guildId,
  inventory_id: inventory.id,
  action: 'sold',
  quantity: 1,
  price: 45,
  performed_by: userId
});
```

## 📁 Database Location

By default, the database is created at:
```
./data/bruno-bot.db
```

You can change the location by setting the `DB_PATH` environment variable:
```bash
DB_PATH=/path/to/custom/database.db
```

## 🐳 Docker

With Docker, the database persists via a mounted volume:

```yaml
volumes:
  - ./data:/app/data
```

This ensures data persists even if the container restarts or is rebuilt.

## 🧪 Testing

To test the database:

```bash
# Build and run tests
pnpm run build && node dist/test-db.js
```

This script creates test data for all features and verifies operations work correctly.

## 🔒 Security

- Database uses **foreign keys** to maintain referential integrity
- All queries use **prepared statements** to prevent SQL injection
- Timestamps stored in Unix format (seconds since epoch)
- `.db` file is in `.gitignore` to avoid committing sensitive data

## 🚀 Future Migrations

The schema includes a `schema_version` table to track versions and facilitate future migrations:

```sql
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

When you need to modify the schema, create a new migration file and update the version.

## 📊 Indexes

The database includes optimized indexes for common queries:

- `idx_reminders_guild_id` - Reminder lookup by server
- `idx_weather_conditions_guild_id` - Weather conditions by server
- `idx_item_catalog_rarity` - Filter items by rarity
- `idx_shop_inventory_available` - Available shop items
- And more...

## 💡 Performance Tips

1. **Transactions**: For multiple operations, use better-sqlite3 transactions
2. **Prepared Statements**: Already implemented in DatabaseService
3. **Indexes**: Indexes are optimized for most frequent queries
4. **Backup**: Consider periodic backups of the `.db` file

## 🔗 References

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [TypeScript Types](./src/types/Database.ts)
- [Database Schema](./src/database/schema.sql)
