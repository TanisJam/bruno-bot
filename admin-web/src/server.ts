import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config';
import { DatabaseService } from './services/database.service';

// Import routes
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';

class Server {
  private app: Application;
  private db: DatabaseService;

  constructor() {
    this.app = express();
    this.db = DatabaseService.getInstance(config.DB_PATH);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.ALLOWED_ORIGINS,
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Session middleware
    this.app.use(session({
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // For Docker localhost
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
        path: '/',
      },
      name: 'bruno-bot-session', // Explicit cookie name
    }));

    // Static files
    this.app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
    this.app.use('/static', express.static(path.join(__dirname, 'public')));

    // Set view engine
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/auth', authRoutes);
    this.app.use('/api', apiRoutes);
    this.app.use('/admin', adminRoutes);

    // Root redirect to admin dashboard
    this.app.get('/', (req: Request, res: Response) => {
      res.redirect('/admin/dashboard');
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).render('error', {
        title: 'Página no encontrada',
        message: 'La página que buscas no existe.',
        status: 404,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Server error:', error);
      
      res.status(500).render('error', {
        title: 'Error del servidor',
        message: config.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error interno.',
        status: 500,
        error: config.NODE_ENV === 'development' ? error : null,
      });
    });
  }

  public start(): void {
    this.app.listen(config.PORT, () => {
      console.log(`🚀 Admin web server running on port ${config.PORT}`);
      console.log(`📊 Dashboard available at: http://localhost:${config.PORT}/admin/dashboard`);
      console.log(`🔧 Environment: ${config.NODE_ENV}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public getDatabase(): DatabaseService {
    return this.db;
  }
}

// Graceful shutdown
const server = new Server();

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.getDatabase().close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.getDatabase().close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  server.start();
}

export default server;