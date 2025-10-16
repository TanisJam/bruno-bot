import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// Extend Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        authenticated: boolean;
        timestamp: number;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔍 Auth check:', {
    hasSession: !!req.session,
    authenticated: req.session?.authenticated,
    hasToken: !!req.session?.token,
    sessionId: req.sessionID,
  });

  // Check session first
  if (req.session?.authenticated && req.session?.token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(req.session.token, config.JWT_SECRET) as any;
      req.user = decoded;
      console.log('✅ Auth successful for session:', req.sessionID);
      return next();
    } catch (error) {
      // Token is invalid, destroy session
      console.log('❌ Invalid token, destroying session');
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }
  }

  // No session or not authenticated
  console.log('❌ No valid session found');
  res.redirect('/auth/login');
};

export const requireApiAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};