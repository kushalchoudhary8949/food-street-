/**
 * @file server.js
 * @module server
 * @description
 * Full-Stack Express Server & Vite Development / SSR Middleware for FoodZa.
 * 
 * Features:
 * - PostgreSQL Native Persistence with Prisma schema compatibility
 * - Customer WhatsApp OTP Authentication via YouPI Payment Gateway
 * - Customer Profile and Delivery Address Management
 * - Immutable Order Delivery Snapshots & Transactions
 * - Backward compatibility with Supabase Cloud Edge Function and MongoDB
 */

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import { testConnection, query } from './src/backend/db.js';
import { authRouter } from './src/backend/routes/authRoutes.js';
import { userRouter } from './src/backend/routes/userRoutes.js';
import { addressRouter } from './src/backend/routes/addressRoutes.js';
import { orderRouter } from './src/backend/routes/orderRoutes.js';

// -------------------------------------------------------------
// Cloud Database Configuration (Supabase PostgreSQL & Edge Functions)
// -------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://pdteqhpihbgxcsyrxdgj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdGVxaHBpaGJneGNzeXJ4ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDk3MzUsImV4cCI6MjEwNzYyNTczNX0.rHBIJMJyvHHPWO5Zh5awwBthVXyNFIj5GuBrJoi4Zhw';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const SUPABASE_EDGE_URL = SUPABASE_URL + '/functions/v1/food-street';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4000);
const isDevelopment = process.env.NODE_ENV !== 'production';

// Express Middleware: JSON, URL-Encoded, and Lightweight Cookie Parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        req.cookies[parts[0]] = decodeURIComponent(parts.slice(1).join('='));
      }
    });
  }
  next();
});

// -------------------------------------------------------------
// API V1 Routes (PostgreSQL & YouPI WhatsApp Auth)
// -------------------------------------------------------------
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/addresses', addressRouter);
app.use('/api/v1/orders', orderRouter);

// -------------------------------------------------------------
// System Health and Diagnostic Status
// -------------------------------------------------------------
app.get('/api/status', async (req, res) => {
  try {
    const youpiApiUrl = process.env.YOUPI_OTP_API_URL ||
      (isDevelopment ? process.env.YOUPI_API_URL || 'http://127.0.0.1:6100' : null);
    const youpiSecretConfigured = Boolean(process.env.FOODZA_OTP_API_SECRET?.trim());
    const [userCount, sessionCount, otpCount, addressCount, orderCount, storeCount, categoryCount] =
      await Promise.all([
        query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM sessions').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM otp_requests').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM addresses').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM orders').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM stores').catch(() => ({ rows: [{ count: 0 }] })),
        query('SELECT COUNT(*) as count FROM categories').catch(() => ({ rows: [{ count: 0 }] })),
      ]);

    return res.json({
      success: true,
      service: 'FoodZa Core Backend',
      database: 'PostgreSQL',
      counts: {
        users: parseInt(userCount.rows[0].count, 10),
        sessions: parseInt(sessionCount.rows[0].count, 10),
        otpRequests: parseInt(otpCount.rows[0].count, 10),
        addresses: parseInt(addressCount.rows[0].count, 10),
        orders: parseInt(orderCount.rows[0].count, 10),
        stores: parseInt(storeCount.rows[0].count, 10),
        categories: parseInt(categoryCount.rows[0].count, 10),
      },
      youpiIntegration: {
        configured: Boolean(youpiApiUrl && youpiSecretConfigured),
        apiUrlPresent: Boolean(youpiApiUrl),
        secretConfigured: youpiSecretConfigured,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy `/api/orders` alias forwarding to `/api/v1/orders`
app.use('/api/orders', orderRouter);

// Legacy `/api/stores` & `/api/categories` handlers with PostgreSQL first, then Supabase fallback
for (const resource of ['stores', 'categories']) {
  app.get(`/api/${resource}`, async (req, res, next) => {
    try {
      const result = await query(`SELECT * FROM ${resource} ORDER BY id ASC`);
      if (result.rows.length > 0) {
        return res.json({
          success: true,
          [resource]: result.rows.map((r) => r.data),
        });
      }
    } catch {
      // Fall through to next middleware (Supabase proxy)
    }
    return next();
  });

  app.post(`/api/${resource}`, async (req, res, next) => {
    try {
      const body = req.body;
      const records = Array.isArray(body) ? body : body?.[resource] || [body];
      const validRecords = records.filter((r) => r?.id);

      if (validRecords.length > 0) {
        await Promise.all(
          validRecords.map((r) =>
            query(
              `INSERT INTO ${resource} (id, name, data, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [String(r.id), r.name || '', JSON.stringify(r)]
            )
          )
        );
        return res.json({ success: true, count: validRecords.length });
      }
    } catch {
      // Fall through to next middleware
    }
    return next();
  });
}

// -------------------------------------------------------------
// Fallback API Proxy: Forward unhandled /api calls to Supabase Edge Function
// -------------------------------------------------------------
app.use('/api', async (req, res) => {
  try {
    const targetUrl = new URL(`${SUPABASE_EDGE_URL}${req.url}`);
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'Failed to communicate with Supabase backend: ' + err.message,
    });
  }
});

// -------------------------------------------------------------
// Development (Vite Middleware) vs Production (Static Serve)
// -------------------------------------------------------------
if (isDevelopment) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(
    express.static(path.join(__dirname, 'dist'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('version.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Test PostgreSQL on startup
await testConnection();

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB startup connection failed:', error.message));
}

app.listen(port, '0.0.0.0', () => {
  console.log(` FoodZa server running on http://localhost:${port}`);
});
