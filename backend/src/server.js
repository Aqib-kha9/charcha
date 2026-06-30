import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { startEscalationScheduler } from './services/escalationService.js';

/**
 * Starts the CHARCHA backend server.
 * Connects to MongoDB first, then starts the Express server.
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 CHARCHA API running in ${config.env} mode on port ${config.port}`);
      logger.info(`📍 Health check: http://localhost:${config.port}/health`);
      logger.info(`🔗 API base URL: http://localhost:${config.port}/api`);

      // Start the auto-escalation scheduler (daily sweep of overdue issues)
      startEscalationScheduler();
      logger.info('⏰ Auto-escalation scheduler started (daily sweep)');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM (for Cloud Run / container shutdown)
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
