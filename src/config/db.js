/**
 * Folder: src/config/
 * Description: Holds application-wide configuration files and database setup logic.
 *
 * File: src/config/db.js
 * Implementation details:
 * - Initializes SQLite database connection pointing to database/network_logs.db.
 * - Creates network_logs schema if it does not already exist.
 * - Seeds 200 sample network traffic logs automatically on initial database creation.
 * - Creates indexes on frequently queried analytical columns (source_ip, status_code, endpoint, timestamp).
 * - Exports Promise-based wrapper functions (queryAll, queryGet) to adapt SQLite's callback pattern
 *   into modern async/await promises consumed by the repository layer.
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve current directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate the SQLite database file relative to workspace
const dbPath = path.resolve(__dirname, '../../database/network_logs.db');

sqlite3.verbose();

// Open or create SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');

    db.serialize(() => {
      // Step 1: Create network_logs table schema if needed
      db.run(`
        CREATE TABLE IF NOT EXISTS network_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_ip TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          timestamp TEXT NOT NULL
        )
      `);

      // Step 2: Seed initial sample log data if the table is empty
      db.get('SELECT COUNT(*) AS count FROM network_logs', (err, row) => {
        if (!err && row && row.count === 0) {
          console.log('Inserting sample log data...');

          const endpoints = [
            '/login',
            '/products',
            '/orders',
            '/profile',
            '/checkout',
            '/cart',
            '/admin',
            '/search'
          ];

          const methods = ['GET', 'POST', 'PUT'];
          const statusCodes = [200, 200, 200, 200, 401, 404, 500];

          const stmt = db.prepare(`
            INSERT INTO network_logs
            (source_ip, endpoint, method, status_code, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `);

          for (let i = 1; i <= 200; i++) {
            const ip = `192.168.1.${Math.floor(Math.random() * 50) + 1}`;
            const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
            const method = methods[Math.floor(Math.random() * methods.length)];
            const status = statusCodes[Math.floor(Math.random() * statusCodes.length)];
            const time = new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ).toISOString();

            stmt.run(ip, endpoint, method, status, time);
          }

          stmt.finalize();
          console.log('200 sample logs inserted.');
        }
      });

      // Step 3: Ensure database indexes exist for optimized analytical queries
      db.run('CREATE INDEX IF NOT EXISTS idx_source_ip ON network_logs(source_ip)');
      db.run('CREATE INDEX IF NOT EXISTS idx_status_code ON network_logs(status_code)');
      db.run('CREATE INDEX IF NOT EXISTS idx_endpoint ON network_logs(endpoint)');
      db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON network_logs(timestamp)');
    });
  }
});

/**
 * Executes a SQL query expected to return multiple rows.
 * @param {string} sql - SQL query string with parameter placeholders (?)
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Array>} Promise resolving to an array of result rows
 */
export function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Executes a SQL query expected to return a single row.
 * @param {string} sql - SQL query string with parameter placeholders (?)
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Object>} Promise resolving to a single result row object
 */
export function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export default db;
