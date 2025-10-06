const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Daily rotate file transport for all logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'campo-directo-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// Daily rotate file transport for error logs only
const errorRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

// Daily rotate file transport for API access logs
const accessRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Create the main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'campo-directo'
  },
  transports: [
    dailyRotateFileTransport,
    errorRotateFileTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ],
  exitOnError: false
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create separate logger for access logs
const accessLogger = winston.createLogger({
  transports: [accessRotateFileTransport],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Log rotation event handlers
dailyRotateFileTransport.on('rotate', function(oldFilename, newFilename) {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

dailyRotateFileTransport.on('archive', function (zipFilename) {
  logger.info('Log file archived', { zipFilename });
});

// Helper functions for structured logging
const logHelpers = {
  // Log API requests
  apiRequest: (req, statusCode, responseTime) => {
    accessLogger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      timestamp: new Date().toISOString()
    });
  },

  // Log authentication events
  auth: (event, userId, email, ip) => {
    logger.info('Auth Event', {
      event,
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  // Log database operations
  database: (operation, table, userId, details = {}) => {
    logger.info('Database Operation', {
      operation,
      table,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // Log business events (transactions, orders, etc.)
  business: (event, details) => {
    logger.info('Business Event', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // Log security events
  security: (event, userId, ip, details = {}) => {
    logger.warn('Security Event', {
      event,
      userId,
      ip,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // Log errors with context
  error: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  // Log performance metrics
  performance: (operation, duration, details = {}) => {
    logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware for request logging
const requestLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log request start
  logger.debug('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log when request completes
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log API request
    logHelpers.apiRequest(req, res.statusCode, responseTime);
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow Request', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

module.exports = {
  logger,
  accessLogger,
  logHelpers,
  requestLoggerMiddleware
};