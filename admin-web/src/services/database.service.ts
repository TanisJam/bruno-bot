import Database from 'better-sqlite3';
import config from '../config';
import * as Types from '../types/database.types';

/**
 * Database service for managing SQLite operations (shared with bot)
 */
export class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  private constructor(dbPath: string) {
    console.log(`📂 Initializing database at: ${dbPath}`);

    // Create database connection
    this.db = new Database(dbPath, {
      verbose: (message) => console.debug(`SQLite: ${message}`)
    });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Schema is already initialized by the bot, no need to reinitialize
    console.log('✅ Database connected successfully');
  }

  /**
   * Get singleton instance of DatabaseService
   */
  public static getInstance(dbPath?: string): DatabaseService {
    if (!DatabaseService.instance) {
      if (!dbPath) {
        throw new Error('Database path is required for first initialization');
      }
      DatabaseService.instance = new DatabaseService(dbPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Get the database connection
   */
  public getConnection(): Database.Database {
    return this.db;
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
    console.log('🔒 Database connection closed');
  }

  // ==================== GUILD OPERATIONS ====================

  /**
   * Get all guilds
   */
  public getGuilds(): Types.Guild[] {
    const stmt = this.db.prepare('SELECT * FROM guilds ORDER BY name');
    return stmt.all() as Types.Guild[];
  }

  /**
   * Get guild by ID
   */
  public getGuild(guildId: string): Types.Guild | undefined {
    const stmt = this.db.prepare('SELECT * FROM guilds WHERE id = ?');
    return stmt.get(guildId) as Types.Guild | undefined;
  }

  // ==================== REMINDER OPERATIONS ====================

  /**
   * Get all reminders for a guild
   */
  public getReminders(guildId: string): Types.Reminder[] {
    const stmt = this.db.prepare('SELECT * FROM reminders WHERE guild_id = ? ORDER BY day_of_week, time');
    return stmt.all(guildId) as Types.Reminder[];
  }

  /**
   * Get all reminders across all guilds
   */
  public getAllReminders(): (Types.Reminder & { guild_name: string })[] {
    const stmt = this.db.prepare(`
      SELECT r.*, g.name as guild_name 
      FROM reminders r 
      JOIN guilds g ON r.guild_id = g.id 
      ORDER BY g.name, r.day_of_week, r.time
    `);
    return stmt.all() as (Types.Reminder & { guild_name: string })[];
  }

  /**
   * Create a new reminder
   */
  public createReminder(reminder: Omit<Types.Reminder, 'id' | 'created_at' | 'updated_at'>): Types.Reminder {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (guild_id, channel_id, message, day_of_week, time, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      reminder.guild_id,
      reminder.channel_id,
      reminder.message,
      reminder.day_of_week,
      reminder.time,
      reminder.enabled ? 1 : 0
    ) as Types.Reminder;
  }

  /**
   * Update a reminder
   */
  public updateReminder(id: number, updates: Partial<Omit<Types.Reminder, 'id' | 'guild_id' | 'created_at'>>): Types.Reminder | undefined {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE reminders
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values, id) as Types.Reminder | undefined;
  }

  /**
   * Delete a reminder
   */
  public deleteReminder(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== SHOP OPERATIONS ====================

  /**
   * Get all items (optionally filtered by guild)
   */
  public getItems(guildId?: string): Types.ItemCatalog[] {
    if (guildId) {
      const stmt = this.db.prepare('SELECT * FROM item_catalog WHERE guild_id = ? OR guild_id IS NULL ORDER BY rarity, type, name');
      return stmt.all(guildId) as Types.ItemCatalog[];
    }

    const stmt = this.db.prepare('SELECT * FROM item_catalog WHERE guild_id IS NULL ORDER BY rarity, type, name');
    return stmt.all() as Types.ItemCatalog[];
  }

  /**
   * Get current shop inventory for a guild
   */
  public getCurrentInventory(guildId: string): (Types.ShopInventory & { 
    item_name: string;
    item_type: string | null;
    item_rarity: string | null;
    item_description: string | null;
    item_base_price: number;
  })[] {
    const stmt = this.db.prepare(`
      SELECT
        si.*,
        ic.name as item_name,
        ic.type as item_type,
        ic.rarity as item_rarity,
        ic.description as item_description,
        ic.base_price as item_base_price
      FROM shop_inventory si
      JOIN item_catalog ic ON si.item_id = ic.id
      WHERE si.guild_id = ? AND si.is_available = 1 AND si.removed_at IS NULL
      ORDER BY ic.rarity, ic.name
    `);

    return stmt.all(guildId) as any[];
  }

  /**
   * Get transaction history for a guild
   */
  public getTransactionHistory(guildId: string, limit: number = 50): (Types.ShopTransaction & { item_name: string })[] {
    const stmt = this.db.prepare(`
      SELECT st.*, ic.name as item_name
      FROM shop_transactions st
      JOIN shop_inventory si ON st.inventory_id = si.id
      JOIN item_catalog ic ON si.item_id = ic.id
      WHERE st.guild_id = ?
      ORDER BY st.performed_at DESC
      LIMIT ?
    `);

    return stmt.all(guildId, limit) as any[];
  }

  // ==================== WEATHER OPERATIONS ====================

  /**
   * Get all weather conditions for a guild
   */
  public getWeatherConditions(guildId: string): Types.WeatherCondition[] {
    const stmt = this.db.prepare('SELECT * FROM weather_conditions WHERE guild_id = ? ORDER BY name');
    return stmt.all(guildId) as Types.WeatherCondition[];
  }

  /**
   * Get weather history for a guild
   */
  public getWeatherHistory(guildId: string, limit: number = 30): (Types.WeatherHistory & { condition_name: string })[] {
    const stmt = this.db.prepare(`
      SELECT wh.*, wc.name as condition_name
      FROM weather_history wh
      JOIN weather_conditions wc ON wh.condition_id = wc.id
      WHERE wh.guild_id = ?
      ORDER BY wh.posted_at DESC
      LIMIT ?
    `);

    return stmt.all(guildId, limit) as any[];
  }

  // ==================== DASHBOARD STATISTICS ====================

  /**
   * Get dashboard statistics
   */
  public getDashboardStats(): Types.DashboardStats {
    const guildsCount = this.db.prepare('SELECT COUNT(*) as count FROM guilds').get() as { count: number };
    const remindersCount = this.db.prepare('SELECT COUNT(*) as count FROM reminders').get() as { count: number };
    const activeRemindersCount = this.db.prepare('SELECT COUNT(*) as count FROM reminders WHERE enabled = 1').get() as { count: number };
    const itemsCount = this.db.prepare('SELECT COUNT(*) as count FROM item_catalog').get() as { count: number };
    const inventoryCount = this.db.prepare('SELECT COUNT(*) as count FROM shop_inventory WHERE is_available = 1').get() as { count: number };

    return {
      guilds: guildsCount.count,
      reminders: remindersCount.count,
      activeReminders: activeRemindersCount.count,
      items: itemsCount.count,
      inventoryItems: inventoryCount.count,
    };
  }
}