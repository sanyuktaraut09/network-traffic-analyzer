/**
 * Folder: src/repositories/
 * Description: User Data Access Layer (DAL) for user account queries.
 *
 * File: src/repositories/userRepository.js
 * Implementation details:
 * - Executes PostgreSQL queries against the users database table using pg connection Pool.
 * - Free of HTTP concerns (req, res) and authentication business logic.
 * - Uses parameterized queries ($1) to prevent SQL injection attacks.
 */

import pool from '../config/db.js';

/**
 * Finds a user account record by username.
 * @param {string} username - Unique account username to query
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function findByUsername(username) {
  const { rows } = await pool.query(
    `SELECT id, username, password_hash, role, created_at
     FROM users
     WHERE username = $1`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Creates a new user account record in the database.
 * @param {Object} userData - Account details object containing username, password_hash, and role
 * @returns {Promise<Object>} Created user record without sensitive password_hash
 */
export async function createUser({ username, password_hash, role = 'analyst' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, username, role, created_at`,
    [username, password_hash, role]
  );
  return rows[0];
}
