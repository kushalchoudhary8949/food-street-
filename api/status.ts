import { query, getPool } from './db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const storesRes = await query('SELECT COUNT(*) as count FROM stores');
    const categoriesRes = await query('SELECT COUNT(*) as count FROM categories');
    const ordersRes = await query('SELECT COUNT(*) as count FROM orders');

    return res.status(200).json({
      success: true,
      connected: true,
      database: 'PostgreSQL',
      counts: {
        stores: parseInt(storesRes.rows[0]?.count || '0', 10),
        categories: parseInt(categoriesRes.rows[0]?.count || '0', 10),
        orders: parseInt(ordersRes.rows[0]?.count || '0', 10),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      connected: false,
      database: 'PostgreSQL',
      error: error.message || 'Database connection error',
    });
  }
}
