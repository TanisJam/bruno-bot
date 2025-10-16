import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { requireApiAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all API routes
router.use(requireApiAuth);

// Dashboard statistics
router.get('/stats', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Guilds
router.get('/guilds', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const guilds = db.getGuilds();
    res.json(guilds);
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/guilds/:id', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const guild = db.getGuild(req.params.id);
    if (!guild) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }
    res.json(guild);
  } catch (error) {
    console.error('Error fetching guild:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reminders
router.get('/reminders', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const { guildId } = req.query;
    let reminders;
    
    if (guildId && typeof guildId === 'string') {
      reminders = db.getReminders(guildId);
    } else {
      reminders = db.getAllReminders();
    }
    
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reminders', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const reminder = db.createReminder(req.body);
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/reminders/:id', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const reminder = db.updateReminder(parseInt(req.params.id), req.body);
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/reminders/:id', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const success = db.deleteReminder(parseInt(req.params.id));
    if (!success) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Shop
router.get('/shop/items', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const { guildId } = req.query;
    const items = db.getItems(guildId as string);
    res.json(items);
  } catch (error) {
    console.error('Error fetching shop items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shop/inventory/:guildId', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const inventory = db.getCurrentInventory(req.params.guildId);
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching shop inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shop/transactions/:guildId', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = db.getTransactionHistory(req.params.guildId, limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching shop transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Weather
router.get('/weather/conditions/:guildId', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const conditions = db.getWeatherConditions(req.params.guildId);
    res.json(conditions);
  } catch (error) {
    console.error('Error fetching weather conditions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/weather/history/:guildId', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const limit = parseInt(req.query.limit as string) || 30;
    const history = db.getWeatherHistory(req.params.guildId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching weather history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;