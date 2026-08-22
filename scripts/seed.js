/**
 * File: scripts/seed.js
 * Description: Standalone data seeding script for PostgreSQL network_logs database.
 * Implementation details:
 * - Decoupled from application server startup.
 * - Seeds 500 realistic traffic entries within a single database transaction (BEGIN/COMMIT).
 * - Uses weighted HTTP status codes and endpoints for realistic traffic analysis.
 */

import pool from '../src/config/db.js';

const IPS = Array.from({ length: 50 }, (_, i) => `192.168.1.${i + 1}`);
const ENDPOINTS = [
  '/login',
  '/products',
  '/orders',
  '/checkout',
  '/profile',
  '/search',
  '/cart',
  '/payments'
];
const METHODS = ['GET', 'POST', 'PUT'];
const STATUSES = [200, 200, 200, 200, 401, 404, 500]; // Weighted toward status 200 Success

async function seed() {
  console.log('Connecting to database for seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const values = Array.from({ length: 500 }, () => {
      const ip = IPS[Math.floor(Math.random() * IPS.length)];
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      const method = METHODS[Math.floor(Math.random() * METHODS.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const ts = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      return `('${ip}', '${endpoint}', '${method}', ${status}, '${ts.toISOString()}')`;
    });

    await client.query(
      `INSERT INTO network_logs (source_ip, endpoint, method, status_code, timestamp)
       VALUES ${values.join(',')}`
    );

    await client.query('COMMIT');
    console.log('Successfully seeded 500 realistic network log rows into PostgreSQL database.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed! Transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
