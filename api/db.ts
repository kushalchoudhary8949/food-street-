import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config();

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URI ||
    process.env.POSTGRESQL_URL;

  const config: PoolConfig = {};

  if (connectionString) {
    config.connectionString = connectionString;
    // Enable SSL for cloud PostgreSQL (Neon, Supabase, Render, Railway, AWS RDS, etc.)
    if (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) {
      config.ssl = { rejectUnauthorized: false };
    }
  } else if (process.env.PGHOST) {
    config.host = process.env.PGHOST;
    config.user = process.env.PGUSER || 'postgres';
    config.password = process.env.PGPASSWORD || '';
    config.database = process.env.PGDATABASE || 'food_connect';
    config.port = Number(process.env.PGPORT) || 5432;
    if (config.host !== 'localhost' && config.host !== '127.0.0.1') {
      config.ssl = { rejectUnauthorized: false };
    }
  } else {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not defined.');
  }

  config.max = 10;
  config.idleTimeoutMillis = 30000;
  config.connectionTimeoutMillis = 10000;

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

let initialized = false;

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      order_number VARCHAR(255),
      status VARCHAR(50),
      grand_total NUMERIC(10, 2),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
  `);

  initialized = true;
}

export async function query(text: string, params?: any[]) {
  const p = getPool();
  await initDatabase();
  return p.query(text, params);
}
