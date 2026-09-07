/**
 * MongoDB connection and lifecycle management
 */
const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connected successfully', { uri: config.mongoUri });
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    // Connect with a 5-second server selection timeout to avoid hanging indefinitely if offline
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    isConnected = false;
    logger.error('Failed to establish initial MongoDB connection', {
      error: err.message,
      hint: 'Ensure MongoDB is running or update MONGODB_URI in .env',
    });
  }
}

function getDatabaseStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return stateMap[mongoose.connection.readyState] || 'unknown';
}

async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed gracefully');
  }
}

module.exports = {
  connectDB,
  getDatabaseStatus,
  closeDB,
};

