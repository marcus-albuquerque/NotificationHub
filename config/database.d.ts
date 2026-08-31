/**
 * NotificationHub - Database Configuration
 *
 * Manages PostgreSQL connection pool and schema initialization
 */
import { Pool, PoolClient } from 'pg';
/**
 * Initialize database connection pool
 */
export declare function initializeDatabase(): Promise<void>;
/**
 * Get database connection pool
 */
export declare function getPool(): Pool;
/**
 * Get single database connection
 */
export declare function getConnection(): Promise<PoolClient>;
/**
 * Close database pool
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Execute a query
 */
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
/**
 * Execute a query and return single row
 */
export declare function queryOne<T = any>(text: string, params?: any[]): Promise<T | null>;
/**
 * Execute an insert query
 */
export declare function insertOne<T = any>(text: string, params?: any[]): Promise<T>;
//# sourceMappingURL=database.d.ts.map