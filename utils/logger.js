"use strict";
/**
 * Logger utility for consistent logging across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const currentLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;
const formatTimestamp = () => {
    return new Date().toISOString();
};
const log = (level, message, data) => {
    if (LOG_LEVELS[level] >= currentLevel) {
        const timestamp = formatTimestamp();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`);
    }
};
const logger = {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
};
exports.logger = logger;
exports.default = logger;
//# sourceMappingURL=logger.js.map