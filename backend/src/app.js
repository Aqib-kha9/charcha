import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';

import config from './config/index.js';
import logger from './utils/logger.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import heatmapRoutes from './routes/heatmapRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authorityRoutes from './routes/authorityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import path from 'path';

const app = express();

// =====================
// Static File Serving
// =====================
// Serve uploads folder so frontend can access images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// =====================
// Security Middleware
// =====================
app.use(helmet());
app.use(
  cors({
    origin: [
      config.clientUrl,
      'https://storage.googleapis.com',
      'https://charcha-501017.web.app',
      'https://charcha-501017.firebaseapp.com',
      'http://localhost:3000',
      'http://localhost:8080',
      /\.run\.app$/,
    ],
    credentials: true,
  })
);

// =====================
// Rate Limiting
// =====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api', limiter);

// =====================
// Body Parser
// =====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection and XSS
app.use(mongoSanitize());
app.use(hpp());
app.use(xss());

// =====================
// Compression & Logging
// =====================
app.use(compression());
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =====================
// Health Check Route
// =====================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CHARCHA API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// =====================
// API Routes (to be wired up)
// =====================
const apiRouter = express.Router();
apiRouter.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CHARCHA API',
    version: '1.0.0',
    documentation: '/api/docs (coming soon)',
  });
});

// Mount route modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/issues', issueRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/alerts', alertRoutes);
apiRouter.use('/heatmap', heatmapRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/authorities', authorityRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/users', userRoutes);

app.use('/api', apiRouter);

// =====================
// Error Handling
// =====================
app.use(notFound);
app.use(errorHandler);

export default app;
