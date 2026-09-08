/**
 * Server Entry Point
 * Starts HTTP listener and initializes MongoDB connection.
 */
const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, closeDB, getDatabaseStatus } = require('./src/config/db');
const { seedDefaultUsers } = require('./src/utils/seedUsers');
const logger = require('./src/utils/logger');

async function startServer() {
  // Initialize Database connection
  await connectDB();

  // Seed initial users & real MP allocations if database is connected and empty
  if (getDatabaseStatus() === 'connected') {
    await seedDefaultUsers();
    try {
      const { seedScStReference } = require('./src/utils/seedScStReference');
      await seedScStReference();
    } catch (err) {
      logger.warn('Could not seed SC/ST references on startup', { error: err.message });
    }
    try {
      const { MpAllocation } = require('./src/models/MpAllocation');
      const allocationCount = await MpAllocation.countDocuments();
      if (allocationCount === 0) {
        const { loadMpAllocation } = require('./src/utils/loadMpAllocation');
        await loadMpAllocation();
      }
    } catch (err) {
      logger.warn('Could not auto-ingest MP allocations on startup', { error: err.message });
    }
  }

  const server = app.listen(config.port, () => {
    logger.info(`MPLADS Backend Server running in [${config.env}] mode on port ${config.port}`);
    logger.info(`Health check available at http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeDB();
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Fatal error during server startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

