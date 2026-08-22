/**
 * Folder: src/config/
 * Description: Holds application-wide database connection pool setup.
 *
 * File: src/config/db.js
 * Implementation details:
 * - Replaces SQLite connection with PostgreSQL connection pool (pg.Pool).
 * - Reads database configuration from environment variables (dotenv).
 * - Manages concurrent connections automatically with idle timeouts.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'network_analyzer',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export default pool;
