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
  null; // No local fallback — avoids ECONNREFUSED spam when no local DB is running

export const pool = new Pool({
  connectionString: connectionString || undefined,
  max: connectionString ? 20 : 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
  if (!connectionString) {
    throw Object.assign(new Error('No database configured'), { code: 'ECONNREFUSED' });
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] (${duration}ms) ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (err) {
    // Suppress noisy ECONNREFUSED spam — routes handle these gracefully
    if (err.code !== 'ECONNREFUSED') {
      console.error(`[SQL Error] in query: ${text.slice(0, 120)}:`, err.message);
    }
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
  if (!connectionString) {
    console.log(' No local PostgreSQL configured — using Supabase Cloud only.');
    return false;
  }
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(` Connected to PostgreSQL Database [${res.rows[0].db_name}] at ${res.rows[0].current_time}`);
    return true;
  } catch (err) {
    console.error(' Failed to connect to PostgreSQL database:', err.message);
    return false;
  }
}
