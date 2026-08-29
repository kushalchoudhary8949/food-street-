import { query } from './db';

export default async function handler(req: any, res: any) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/orders
    if (req.method === 'GET') {
      const result = await query('SELECT data FROM orders ORDER BY created_at DESC');
      const formattedOrders = result.rows.map((row: any) => row.data);

      return res.status(200).json({ success: true, orders: formattedOrders });
    }

    // POST /api/orders (Create or overwrite order)
    if (req.method === 'POST') {
      const order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ success: false, error: 'Invalid order data. Missing order id.' });
      }

      const orderData = {
        ...order,
        createdAtTimestamp: order.createdAtTimestamp || Date.now(),
        updatedAtTimestamp: Date.now(),
      };

      await query(
        `INSERT INTO orders (id, order_number, status, grand_total, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           order_number = EXCLUDED.order_number,
           status = EXCLUDED.status,
           grand_total = EXCLUDED.grand_total,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          order.id,
          order.orderNumber || order.id,
          order.status || 'placed',
          order.grandTotal || 0,
          JSON.stringify(orderData),
        ]
      );

      return res.status(200).json({ success: true, order: orderData });
    }

    // PUT /api/orders (Update order status)
    if (req.method === 'PUT') {
      const { orderId, status } = req.body;
      if (!orderId || !status) {
        return res.status(400).json({ success: false, error: 'Missing orderId or status' });
      }

      await query(
        `UPDATE orders
         SET status = $1,
             data = jsonb_set(data, '{status}', to_jsonb($1::text)),
             updated_at = NOW()
         WHERE id = $2`,
        [status, orderId]
      );

      return res.status(200).json({ success: true });
    }

    // DELETE /api/orders (Delete an order)
    if (req.method === 'DELETE') {
      const orderId = req.query.orderId || req.body?.orderId;
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Missing orderId' });
      }

      await query('DELETE FROM orders WHERE id = $1', [String(orderId)]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Error in /api/orders:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
