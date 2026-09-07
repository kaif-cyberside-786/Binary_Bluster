/**
 * Operational application logger
 * NOTE: Per rules.md §15, application logs are operational/debugging only.
 * They are explicitly separate from permanent, immutable audit_logs.
 * Never log secrets, passwords, tokens, or raw credentials.
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
  return (levels[level] ?? 2) <= (levels[currentLogLevel] ?? 2);
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  // Sanitize meta: never output tokens or passwords if mistakenly passed
  const safeMeta = { ...meta };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'jwt', 'secret', 'authorization'];
  for (const key of Object.keys(safeMeta)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      safeMeta[key] = '[REDACTED]';
    }
  }

  const metaStr = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  error(message, meta) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },
  warn(message, meta) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  info(message, meta) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, meta));
    }
  },
  debug(message, meta) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};

module.exports = logger;

