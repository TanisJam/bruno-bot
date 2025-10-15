import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import * as Types from '../types/Database';

/**
 * Database service for managing SQLite operations
 */
export class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  private constructor(dbPath: string) {
    logger.info(`📂 Initializing database at: ${dbPath}`);

    // Create database connection
    this.db = new Database(dbPath, {
      verbose: (message) => logger.debug(`SQLite: ${message}`)
    });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initializeSchema();

    logger.info('✅ Database initialized successfully');
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
   * Initialize database schema
   */
  private initializeSchema(): void {
    try {
      const schemaPath = join(__dirname, '../database/schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      // Execute schema SQL
      this.db.exec(schema);

      logger.info('📋 Database schema initialized');
    } catch (error) {
      logger.error('❌ Error initializing schema:', error);
      throw error;
    }
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
    logger.info('🔒 Database connection closed');
  }

  // ==================== GUILD OPERATIONS ====================

  /**
   * Ensure guild exists in database
   */
  public ensureGuild(guildId: string, guildName: string): Types.Guild {
    const stmt = this.db.prepare(`
      INSERT INTO guilds (id, name)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        updated_at = strftime('%s', 'now')
      RETURNING *
    `);

    return stmt.get(guildId, guildName) as Types.Guild;
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
   * Get all reminders for a guild
   */
  public getReminders(guildId: string): Types.Reminder[] {
    const stmt = this.db.prepare('SELECT * FROM reminders WHERE guild_id = ?');
    return stmt.all(guildId) as Types.Reminder[];
  }

  /**
   * Get reminder by ID
   */
  public getReminderById(id: number): Types.Reminder | undefined {
    const stmt = this.db.prepare('SELECT * FROM reminders WHERE id = ?');
    return stmt.get(id) as Types.Reminder | undefined;
  }

  /**
   * Get enabled reminders for a guild
   */
  public getEnabledReminders(guildId: string): Types.Reminder[] {
    const stmt = this.db.prepare('SELECT * FROM reminders WHERE guild_id = ? AND enabled = 1');
    return stmt.all(guildId) as Types.Reminder[];
  }

  /**
   * Update a reminder
   */
  public updateReminder(id: number, updates: Partial<Omit<Types.Reminder, 'id' | 'guild_id' | 'created_at'>>): Types.Reminder | undefined {
    // Filtrar solo los campos que existen en la tabla reminders
    const validFields = ['channel_id', 'message', 'day_of_week', 'time', 'enabled'];
    const filteredUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (validFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }
    
    const fields = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(filteredUpdates);

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
  public deleteReminder(id: number, guildId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ? AND guild_id = ?');
    const result = stmt.run(id, guildId);
    return result.changes > 0;
  }

  // ==================== WEATHER OPERATIONS ====================

  /**
   * Create a weather condition
   */
  public createWeatherCondition(condition: Omit<Types.WeatherCondition, 'id' | 'created_at' | 'updated_at'>): Types.WeatherCondition {
    const stmt = this.db.prepare(`
      INSERT INTO weather_conditions (guild_id, name, description, effects, probability)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      condition.guild_id,
      condition.name,
      condition.description,
      condition.effects,
      condition.probability
    ) as Types.WeatherCondition;
  }

  /**
   * Get all weather conditions for a guild
   */
  public getWeatherConditions(guildId: string): Types.WeatherCondition[] {
    const stmt = this.db.prepare('SELECT * FROM weather_conditions WHERE guild_id = ?');
    return stmt.all(guildId) as Types.WeatherCondition[];
  }

  /**
   * Update a weather condition
   */
  public updateWeatherCondition(id: number, updates: Partial<Omit<Types.WeatherCondition, 'id' | 'guild_id' | 'created_at'>>): Types.WeatherCondition | undefined {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE weather_conditions
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values, id) as Types.WeatherCondition | undefined;
  }

  /**
   * Delete a weather condition
   */
  public deleteWeatherCondition(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM weather_conditions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get random weather condition based on probability weights
   */
  public getRandomWeatherCondition(guildId: string): Types.WeatherCondition | null {
    const conditions = this.getWeatherConditions(guildId);

    if (conditions.length === 0) return null;

    // Calculate total weight
    const totalWeight = conditions.reduce((sum, c) => sum + c.probability, 0);

    // Generate random number between 0 and total weight
    const random = Math.random() * totalWeight;

    // Select condition based on weighted probability
    let currentWeight = 0;
    for (const condition of conditions) {
      currentWeight += condition.probability;
      if (random <= currentWeight) {
        return condition;
      }
    }

    // Fallback to first condition
    return conditions[0] || null;
  }

  /**
   * Record weather posting in history
   */
  public recordWeatherHistory(guildId: string, conditionId: number): Types.WeatherHistory {
    const stmt = this.db.prepare(`
      INSERT INTO weather_history (guild_id, condition_id)
      VALUES (?, ?)
      RETURNING *
    `);

    return stmt.get(guildId, conditionId) as Types.WeatherHistory;
  }

  // ==================== ITEM CATALOG OPERATIONS ====================

  /**
   * Create an item in the catalog
   */
  public createItem(item: Omit<Types.ItemCatalog, 'id' | 'created_at' | 'updated_at'>): Types.ItemCatalog {
    const stmt = this.db.prepare(`
      INSERT INTO item_catalog (guild_id, link, name, description, type, rarity, base_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      item.guild_id,
      item.link,
      item.name,
      item.description,
      item.type,
      item.rarity,
      item.base_price
    ) as Types.ItemCatalog;
  }

  /**
   * Get all items (optionally filtered by guild)
   */
  public getItems(guildId?: string): Types.ItemCatalog[] {
    if (guildId) {
      const stmt = this.db.prepare('SELECT * FROM item_catalog WHERE guild_id = ? OR guild_id IS NULL');
      return stmt.all(guildId) as Types.ItemCatalog[];
    }

    const stmt = this.db.prepare('SELECT * FROM item_catalog WHERE guild_id IS NULL');
    return stmt.all() as Types.ItemCatalog[];
  }

  /**
   * Update an item
   */
  public updateItem(id: number, updates: Partial<Omit<Types.ItemCatalog, 'id' | 'created_at'>>): Types.ItemCatalog | undefined {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE item_catalog
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values, id) as Types.ItemCatalog | undefined;
  }

  /**
   * Delete an item
   */
  public deleteItem(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM item_catalog WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== SHOP CONFIG OPERATIONS ====================

  /**
   * Get or create shop config for a guild
   */
  public getOrCreateShopConfig(guildId: string): Types.ShopConfig {
    let stmt = this.db.prepare('SELECT * FROM shop_config WHERE guild_id = ?');
    let config = stmt.get(guildId) as Types.ShopConfig | undefined;

    if (!config) {
      stmt = this.db.prepare(`
        INSERT INTO shop_config (guild_id)
        VALUES (?)
        RETURNING *
      `);
      config = stmt.get(guildId) as Types.ShopConfig;
    }

    return config;
  }

  /**
   * Update shop config
   */
  public updateShopConfig(guildId: string, updates: Partial<Omit<Types.ShopConfig, 'id' | 'guild_id' | 'created_at'>>): Types.ShopConfig | undefined {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE shop_config
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE guild_id = ?
      RETURNING *
    `);

    return stmt.get(...values, guildId) as Types.ShopConfig | undefined;
  }

  // ==================== SHOP INVENTORY OPERATIONS ====================

  /**
   * Add item to shop inventory
   */
  public addToInventory(inventory: Omit<Types.ShopInventory, 'id' | 'added_at' | 'removed_at'>): Types.ShopInventory {
    const stmt = this.db.prepare(`
      INSERT INTO shop_inventory (guild_id, item_id, current_price, stock, is_available)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      inventory.guild_id,
      inventory.item_id,
      inventory.current_price,
      inventory.stock,
      inventory.is_available ? 1 : 0
    ) as Types.ShopInventory;
  }

  /**
   * Get current shop inventory for a guild
   */
  public getCurrentInventory(guildId: string): Types.ShopInventoryWithItem[] {
    const stmt = this.db.prepare(`
      SELECT
        si.*,
        ic.id as item_id,
        ic.guild_id as item_guild_id,
        ic.link as item_link,
        ic.name as item_name,
        ic.description as item_description,
        ic.type as item_type,
        ic.rarity as item_rarity,
        ic.base_price as item_base_price,
        ic.created_at as item_created_at,
        ic.updated_at as item_updated_at
      FROM shop_inventory si
      JOIN item_catalog ic ON si.item_id = ic.id
      WHERE si.guild_id = ? AND si.is_available = 1 AND si.removed_at IS NULL
    `);

    const rows = stmt.all(guildId) as any[];

    return rows.map(row => ({
      id: row.id,
      guild_id: row.guild_id,
      item_id: row.item_id,
      current_price: row.current_price,
      stock: row.stock,
      is_available: row.is_available,
      added_at: row.added_at,
      removed_at: row.removed_at,
      item: {
        id: row.item_id,
        guild_id: row.item_guild_id,
        link: row.item_link,
        name: row.item_name,
        description: row.item_description,
        type: row.item_type,
        rarity: row.item_rarity,
        base_price: row.item_base_price,
        created_at: row.item_created_at,
        updated_at: row.item_updated_at
      }
    }));
  }

  /**
   * Remove item from inventory (mark as removed)
   */
  public removeFromInventory(inventoryId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE shop_inventory
      SET is_available = 0, removed_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    const result = stmt.run(inventoryId);
    return result.changes > 0;
  }

  /**
   * Update inventory item stock
   */
  public updateInventoryStock(inventoryId: number, stock: number | null): boolean {
    const stmt = this.db.prepare('UPDATE shop_inventory SET stock = ? WHERE id = ?');
    const result = stmt.run(stock, inventoryId);
    return result.changes > 0;
  }

  // ==================== SHOP TRANSACTION OPERATIONS ====================

  /**
   * Record a shop transaction
   */
  public recordTransaction(transaction: Omit<Types.ShopTransaction, 'id' | 'performed_at'>): Types.ShopTransaction {
    const stmt = this.db.prepare(`
      INSERT INTO shop_transactions (guild_id, inventory_id, action, quantity, price, performed_by)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      transaction.guild_id,
      transaction.inventory_id,
      transaction.action,
      transaction.quantity,
      transaction.price,
      transaction.performed_by
    ) as Types.ShopTransaction;
  }

  /**
   * Get transaction history for a guild
   */
  public getTransactionHistory(guildId: string, limit: number = 50): Types.ShopTransaction[] {
    const stmt = this.db.prepare(`
      SELECT * FROM shop_transactions
      WHERE guild_id = ?
      ORDER BY performed_at DESC
      LIMIT ?
    `);

    return stmt.all(guildId, limit) as Types.ShopTransaction[];
  }

  // ==================== ADDITIONAL SHOP OPERATIONS ====================

  /**
   * Get item by name (case-insensitive)
   * Used to check if item already exists before loading from SDR
   */
  public getItemByName(name: string, guildId?: string): Types.ItemCatalog | undefined {
    let stmt;
    let result;

    if (guildId) {
      stmt = this.db.prepare(`
        SELECT * FROM item_catalog
        WHERE LOWER(name) = LOWER(?) AND (guild_id = ? OR guild_id IS NULL)
        LIMIT 1
      `);
      result = stmt.get(name, guildId);
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM item_catalog
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1
      `);
      result = stmt.get(name);
    }

    return result as Types.ItemCatalog | undefined;
  }

  /**
   * Get items with filters and pagination
   */
  public getItemsByFilters(options: {
    guildId?: string;
    type?: string;
    rarity?: string;
    limit?: number;
    offset?: number;
  }): Types.ItemCatalog[] {
    const conditions: string[] = [];
    const params: any[] = [];

    // Guild filter (include global items)
    if (options.guildId) {
      conditions.push('(guild_id = ? OR guild_id IS NULL)');
      params.push(options.guildId);
    } else {
      conditions.push('guild_id IS NULL');
    }

    // Type filter
    if (options.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    // Rarity filter
    if (options.rarity) {
      conditions.push('rarity = ?');
      params.push(options.rarity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let query = `
      SELECT * FROM item_catalog
      ${whereClause}
      ORDER BY rarity, type, name
    `;

    // Add pagination
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Types.ItemCatalog[];
  }

  /**
   * Count items with filters (for pagination)
   */
  public countItemsByFilters(options: {
    guildId?: string;
    type?: string;
    rarity?: string;
  }): number {
    const conditions: string[] = [];
    const params: any[] = [];

    // Guild filter (include global items)
    if (options.guildId) {
      conditions.push('(guild_id = ? OR guild_id IS NULL)');
      params.push(options.guildId);
    } else {
      conditions.push('guild_id IS NULL');
    }

    // Type filter
    if (options.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    // Rarity filter
    if (options.rarity) {
      conditions.push('rarity = ?');
      params.push(options.rarity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) as count FROM item_catalog
      ${whereClause}
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }
}
