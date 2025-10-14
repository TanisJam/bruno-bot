import * as cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { DatabaseService } from './database.service';
import { logger } from '../utils/logger';
import config from '../config';

/**
 * Service for scheduling and sending weekly reminders
 */
export class SchedulerService {
  private client: Client;
  private db: DatabaseService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(client: Client, db: DatabaseService) {
    this.client = client;
    this.db = db;
  }

  /**
   * Start the scheduler
   * Checks every minute for reminders that need to be sent
   */
  public start(): void {
    if (this.cronJob) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('⏰ Starting reminder scheduler...');

    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    });

    logger.info('✅ Reminder scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('🛑 Reminder scheduler stopped');
    }
  }

  /**
   * Check for reminders that need to be sent and send them
   */
  private async checkAndSendReminders(): Promise<void> {
    try {
      // Use configured timezone for accurate time checking
      const now = DateTime.now().setZone(config.TIMEZONE);
      const currentDay = now.weekday % 7; // Luxon: 1=Monday, 7=Sunday -> Convert to 0=Sunday, 6=Saturday
      const currentTime = now.toFormat('HH:mm');

      // Get all guilds the bot is in
      const guilds = this.client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        // Ensure guild exists in database
        this.db.ensureGuild(guildId, guild.name);

        // Get enabled reminders for this guild
        const reminders = this.db.getEnabledReminders(guildId);

        for (const reminder of reminders) {
          // Check if reminder matches current day and time
          if (reminder.day_of_week === currentDay && reminder.time === currentTime) {
            await this.sendReminder(guildId, reminder);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error checking reminders:', error);
    }
  }

  /**
   * Send a reminder to the specified channel
   */
  private async sendReminder(guildId: string, reminder: any): Promise<void> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        logger.warn(`Guild ${guildId} not found for reminder ${reminder.id}`);
        return;
      }

      const channel = guild.channels.cache.get(reminder.channel_id);
      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn(`Channel ${reminder.channel_id} not found or not a text channel for reminder ${reminder.id}`);
        return;
      }

      // Check if bot has permission to send messages
      const permissions = channel.permissionsFor(this.client.user!);
      if (!permissions?.has('SendMessages')) {
        logger.warn(`Bot lacks permission to send messages in channel ${reminder.channel_id}`);
        return;
      }

      // Send the reminder message
      await channel.send(reminder.message);

      logger.info(`📨 Sent reminder ${reminder.id} to channel ${reminder.channel_id} in guild ${guildId}`);
    } catch (error) {
      logger.error(`❌ Error sending reminder ${reminder.id}:`, error);
    }
  }
}
