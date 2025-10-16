import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

const router = Router();

// Login page
router.get('/login', (req: Request, res: Response) => {
  res.render('auth/login', {
    title: 'Iniciar Sesión - Bruno Bot Admin',
    error: null,
  });
});

// Login POST endpoint
router.post('/login', (req: Request, res: Response) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.render('auth/login', {
      title: 'Iniciar Sesión - Bruno Bot Admin',
      error: 'Se requiere una API key',
    });
  }

  if (apiKey !== config.ADMIN_API_KEY) {
    return res.render('auth/login', {
      title: 'Iniciar Sesión - Bruno Bot Admin',
      error: 'API key inválida',
    });
  }

  // Create JWT token
  const payload = { authenticated: true, timestamp: Date.now() };
  const token = jwt.sign(payload, config.JWT_SECRET) as string;

  // Set session
  req.session.token = token;
  req.session.authenticated = true;

  console.log('🔐 Session set:', {
    authenticated: req.session.authenticated,
    hasToken: !!req.session.token,
    sessionId: req.sessionID,
  });

  res.redirect('/admin/dashboard');
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/auth/login');
  });
});

export default router;