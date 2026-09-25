import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import wishRoutes from './routes/wishRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

export const createApp = (): Application => {
  const app = express();

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Let frontend load fonts and cdn assets without conflict
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parse cookies and JSON bodies
  app.use(cookieParser());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // API Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      message: 'Sarthak & Manya Wedding API is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/wishes', wishRoutes);
  app.use('/api/admin', adminRoutes);

  // Catch-all 404 for unmatched /api routes
  app.use('/api', notFoundHandler);

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
