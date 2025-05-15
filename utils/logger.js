/**
 * EfficientLogger - A powerful and flexible logging utility
 * Combines Winston for file logging and Chalk for console formatting
 */
import winston from 'winston';
import chalk from 'chalk';
import path from 'path';
import 'dotenv/config';

// Environment configuration with defaults
const ENV = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOGGING_ENABLED: ['true', '1', 'yes'].includes(process.env.LOGGING_ENABLED?.toLowerCase()),
  CONSOLE_LOGGING: process.env.DISABLE_CONSOLE_LOGS !== 'true',
  LOG_DIR: process.env.LOG_DIR || 'logs'
};

/**
 * Custom format for console logs using chalk colors
 */
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let colorizedLevel;

  // Color mapping for different log levels
  switch(level) {
    case 'error':
      colorizedLevel = chalk.red.bold(`[ERROR]`);
      break;
    case 'warn':
      colorizedLevel = chalk.yellow(`[WARN]`);
      break;
    case 'info':
      colorizedLevel = chalk.blue(`[INFO]`);
      break;
    case 'debug':
      colorizedLevel = chalk.gray(`[DEBUG]`);
      break;
    case 'success':
      colorizedLevel = chalk.green(`[SUCCESS]`);
      break;
    default:
      colorizedLevel = chalk.white(`[${level.toUpperCase()}]`);
  }

  // Format context if available
  const context = meta.context ? chalk.magenta(`[${meta.context}]`) : '';

  // Format timestamp
  const formattedTime = chalk.gray(timestamp);

  // Format any additional metadata
  let metaStr = '';
  const metaWithoutContext = { ...meta };
  delete metaWithoutContext.context;

  if (Object.keys(metaWithoutContext).length > 0) {
    metaStr = chalk.cyan(`\n${JSON.stringify(metaWithoutContext, null, 2)}`);
  }

  return `${formattedTime} ${colorizedLevel} ${context} ${message}${metaStr}`;
});

/**
 * EfficientLogger class
 */
class EfficientLogger {
  /**
   * Creates a new logger instance
   * @param {Object} options - Configuration options
   * @param {string} options.name - Service or component name (default: 'App')
   * @param {boolean} options.console - Enable console logging (default: true)
   * @param {boolean} options.files - Enable file logging (default: true)
   * @param {string} options.level - Log level (default: from ENV or 'info')
   * @param {string} options.logDir - Directory for log files (default: from ENV or 'logs')
   */
  constructor(options = {}) {
    const {
      name = 'App',
      console = ENV.CONSOLE_LOGGING,
      files = true,
      level = ENV.LOG_LEVEL,
      logDir = ENV.LOG_DIR
    } = options;

    this.name = name;
    this.enabled = ENV.LOGGING_ENABLED;

    // Set up base configuration
    const transports = [];

    // Add console transport if enabled
    if (console) {
      transports.push(new winston.transports.Console({
        level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.splat(),
          consoleFormat
        )
      }));
    }

    // Add file transports if enabled
    if (files) {
      // Ensure log directory exists
      const logDirectory = path.resolve(process.cwd(), logDir);

      transports.push(
        new winston.transports.File({
          filename: path.join(logDirectory, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new winston.transports.File({
          filename: path.join(logDirectory, 'combined.log'),
          level,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level,
      defaultMeta: { context: name },
      transports
    });

    // Add success level to Winston
    this.logger.levels = { ...winston.config.npm.levels, success: 3.5 };
  }

  /**
   * Log entry into a function
   * @param {string} fnName - Function name
   * @param {Object} params - Function parameters (optional)
   */
  entry(fnName, params = {}) {
    if (!this.enabled) return;

    this.logger.debug(`➡️ Entering ${fnName}()`, {
      type: 'entry',
      function: fnName,
      params: Object.keys(params).length > 0 ? params : undefined
    });
  }

  /**
   * Log exit from a function
   * @param {string} fnName - Function name
   * @param {*} result - Function result (optional)
   */
  exit(fnName, result) {
    if (!this.enabled) return;

    this.logger.debug(`⬅️ Exiting ${fnName}()`, {
      type: 'exit',
      function: fnName,
      result: result !== undefined ? result : undefined
    });
  }

  /**
   * Log information message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata (optional)
   */
  info(message, meta = {}) {
    if (!this.enabled) return;
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata (optional)
   */
  warn(message, meta = {}) {
    if (!this.enabled) return;
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   * @param {string} message - Error description
   * @param {Error|Object} error - Error object or details
   * @param {Object} meta - Additional metadata (optional)
   */
  error(message, error, meta = {}) {
    if (!this.enabled) return;

    const errorData = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : error;

    this.logger.error(`${message}`, { ...meta, error: errorData });
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata (optional)
   */
  debug(message, meta = {}) {
    if (!this.enabled) return;
    this.logger.debug(message, meta);
  }

  /**
   * Log success message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata (optional)
   */
  success(message, meta = {}) {
    if (!this.enabled) return;
    this.logger.log('success', message, meta);
  }

  /**
   * Create a child logger with a specific context
   * @param {string} context - Context name
   * @returns {EfficientLogger} Child logger instance
   */
  child(context) {
    const childLogger = new EfficientLogger({
      name: context,
      // Inherit other settings
      console: this.logger.transports.some(t => t instanceof winston.transports.Console),
      files: this.logger.transports.some(t => t instanceof winston.transports.File),
      level: this.logger.level
    });

    return childLogger;
  }
}

/**
 * Create and export a default logger instance
 */
export const logger = new EfficientLogger();

/**
 * Factory function to create custom logger instances
 * @param {Object} options - Configuration options
 * @returns {EfficientLogger} New logger instance
 */
export const createLogger = (options) => new EfficientLogger(options);

export default logger;
