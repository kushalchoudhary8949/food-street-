/**
 * @file db.js
 * @module backend/db
 * @description
 * PostgreSQL connection pool and query helpers for FoodZa using `pg`.
 * Connects to PostgreSQL database configured via `DATABASE_URL` or `POSTGRES_URL`.
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://kushal@127.0.0.1:5432/food_connect';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err.message);
});

/**
 * Execute a query with parameters
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] (${duration}ms) ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] in query: ${text.slice(0, 120)}:`, err.message);
    throw err;
  }
}

/**
 * Get dedicated client for transaction management
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Test database connectivity on startup
 */
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(` Connected to PostgreSQL Database [${res.rows[0].db_name}] at ${res.rows[0].current_time}`);
    return true;
  } catch (err) {
    console.error(' Failed to connect to PostgreSQL database:', err.message);
    return false;
  }
}
