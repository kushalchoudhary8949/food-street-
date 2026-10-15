import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pdteqhpihbgxcsyrxdgj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdGVxaHBpaGJneGNzeXJ4ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDk3MzUsImV4cCI6MjEwNzYyNTczNX0.rHBIJMJyvHHPWO5Zh5awwBthVXyNFIj5GuBrJoi4Zhw';
const SUPABASE_EDGE_URL = `${SUPABASE_URL}/functions/v1/food-street`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Seamless proxy for /api requests to Supabase Edge Function when MongoDB is not connected
app.use('/api', async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

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

// MongoDB Schema & Models for fallback / local MongoDB development
const documentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    orderNumber: String,
    status: String,
    grandTotal: Number,
  },
  { timestamps: true, versionKey: false },
);

const Store = mongoose.model('Store', documentSchema, 'stores');
const Category = mongoose.model('Category', documentSchema, 'categories');
const Order = mongoose.model('Order', documentSchema, 'orders');

const getModel = (resource) => {
  if (resource === 'stores') return Store;
  if (resource === 'categories') return Category;
  if (resource === 'orders') return Order;
  return null;
};

const databaseRequired = (handler) => async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'MongoDB is not connected. Set MONGODB_URI and restart the server.',
    });
  }
  return handler(req, res, next);
};

app.get('/api/status', databaseRequired(async (_req, res) => {
  const [stores, categories, orders] = await Promise.all([
    Store.countDocuments(),
    Category.countDocuments(),
    Order.countDocuments(),
  ]);

  res.json({
    success: true,
    connected: true,
    database: 'MongoDB',
    counts: { stores, categories, orders },
  });
}));

for (const resource of ['stores', 'categories']) {
  const Model = getModel(resource);

  app.get(`/api/${resource}`, databaseRequired(async (_req, res) => {
    const records = await Model.find().sort({ _id: 1 }).lean();
    res.json({ success: true, [resource]: records.map((record) => record.data) });
  }));

  app.post(`/api/${resource}`, databaseRequired(async (req, res) => {
    const body = req.body;
    const records = Array.isArray(body) ? body : body?.[resource] || [body];
    const replace = req.query.replace === 'true' || body?.replace === true;
    const validRecords = records.filter((record) => record?.id);

    await Promise.all(validRecords.map((record) => Model.findByIdAndUpdate(
      String(record.id),
      { _id: String(record.id), name: record.name || '', data: record },
      { upsert: true, setDefaultsOnInsert: true },
    )));

    if (replace && validRecords.length > 0) {
      await Model.deleteMany({ _id: { $nin: validRecords.map((record) => String(record.id)) } });
    }

    res.json({ success: true, count: validRecords.length });
  }));

  app.delete(`/api/${resource}`, databaseRequired(async (req, res) => {
    const id = req.query[resource === 'stores' ? 'storeId' : 'categoryId'] || req.body?.id;
    if (!id) return res.status(400).json({ success: false, error: 'Missing record id' });

    const result = await Model.deleteOne({ _id: String(id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  }));
}

app.get('/api/orders', databaseRequired(async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, orders: orders.map((order) => order.data) });
}));

app.post('/api/orders', databaseRequired(async (req, res) => {
  const order = req.body;
  if (!order?.id) {
    return res.status(400).json({ success: false, error: 'Invalid order data. Missing order id.' });
  }

  const orderData = {
    ...order,
    createdAtTimestamp: order.createdAtTimestamp || Date.now(),
    updatedAtTimestamp: Date.now(),
  };

  await Order.findByIdAndUpdate(
    String(order.id),
    {
      _id: String(order.id),
      orderNumber: order.orderNumber || order.id,
      status: order.status || 'placed',
      grandTotal: Number(order.grandTotal || 0),
      data: orderData,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ success: true, order: orderData });
}));

app.put('/api/orders', databaseRequired(async (req, res) => {
  const { orderId, status } = req.body || {};
  if (!orderId || !status) {
    return res.status(400).json({ success: false, error: 'Missing orderId or status' });
  }

  const order = await Order.findById(String(orderId));
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  order.status = status;
  order.data = { ...order.data, status, updatedAtTimestamp: Date.now() };
  await order.save();
  res.json({ success: true });
}));

app.delete('/api/orders', databaseRequired(async (req, res) => {
  const orderId = req.query.orderId || req.body?.orderId;
  if (!orderId) return res.status(400).json({ success: false, error: 'Missing orderId' });

  await Order.deleteOne({ _id: String(orderId) });
  res.json({ success: true });
}));

app.post('/api/seed', databaseRequired(async (req, res) => {
  const { stores = [], categories = [] } = req.body || {};
  const saveMany = async (Model, records) => Promise.all(
    records.filter((record) => record?.id).map((record) => Model.findByIdAndUpdate(
      String(record.id),
      { _id: String(record.id), name: record.name || '', data: record },
      { upsert: true, setDefaultsOnInsert: true },
    )),
  );

  await Promise.all([saveMany(Store, stores), saveMany(Category, categories)]);
  res.json({
    success: true,
    message: `Successfully processed ${stores.length} stores and ${categories.length} categories into MongoDB.`,
  });
}));

app.use(express.static(path.join(__dirname, 'dist')));

if (isDevelopment) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB startup connection failed:', error.message));
} else {
  console.log('⚡ Connected to Supabase Cloud Backend (PostgreSQL & Edge Functions)');
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Food Street server running on http://localhost:${port}`);
});
