/**
 * Logger utility for consistent logging across the application
 */
declare const logger: {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
};
export { logger };
export default logger;
//# sourceMappingURL=logger.d.ts.map