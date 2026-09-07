/**
 * Express Application Setup
 * Establishes security middleware, routing, and centralized error handling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
  })
);

// CORS
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logging
app.use(requestLogger);

// Mount API routes
app.use('/api', apiRoutes);

// Catch-all 404 Handler for undefined routes
app.use((req, res) => {
  return ApiResponse.notFound(
    res,
    `Route ${req.method} ${req.originalUrl} does not exist on this server`,
    'ROUTE_NOT_FOUND'
  );
});

// Centralized Error Handler (must be last)
app.use(errorHandler);

module.exports = app;

