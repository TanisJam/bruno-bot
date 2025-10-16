import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(requireAuth);

// Dashboard
router.get('/dashboard', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const stats = db.getDashboardStats();
    res.render('dashboard/index', {
      title: 'Dashboard - Bruno Bot Admin',
      stats,
      user: req.user,
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el dashboard',
      status: 500,
    });
  }
});



// Reminders
router.get('/reminders', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const reminders = db.getAllReminders();
    res.render('reminders/index', {
      title: 'Recordatorios - Bruno Bot Admin',
      reminders,
      user: req.user,
    });
  } catch (error) {
    console.error('Error rendering reminders:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar los recordatorios',
      status: 500,
    });
  }
});

// Shop
router.get('/shop', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const items = db.getItems();
    res.render('shop/index', {
      title: 'Tienda - Bruno Bot Admin',
      items,
      user: req.user,
    });
  } catch (error) {
    console.error('Error rendering shop:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la tienda',
      status: 500,
    });
  }
});

// Weather
router.get('/weather', (req: Request, res: Response): void => {
  try {
    const db = DatabaseService.getInstance();
    const guilds = db.getGuilds();
    res.render('weather/index', {
      title: 'Clima - Bruno Bot Admin',
      guilds,
      user: req.user,
    });
  } catch (error) {
    console.error('Error rendering weather:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el clima',
      status: 500,
    });
  }
});

export default router;