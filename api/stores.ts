import { query } from './db';

export default async function handler(req: any, res: any) {
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
    // GET /api/stores
    if (req.method === 'GET') {
      const result = await query('SELECT data FROM stores ORDER BY id ASC');
      const formattedStores = result.rows.map((row: any) => row.data);

      return res.status(200).json({ success: true, stores: formattedStores });
    }

    // POST /api/stores (Save array of stores or single store)
    if (req.method === 'POST') {
      const body = req.body;
      const storesToSave = Array.isArray(body) ? body : [body];

      for (const store of storesToSave) {
        if (store && store.id) {
          await query(
            `INSERT INTO stores (id, name, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [store.id, store.name || '', JSON.stringify(store)]
          );
        }
      }

      return res.status(200).json({ success: true });
    }

    // DELETE /api/stores
    if (req.method === 'DELETE') {
      const storeId = req.query.storeId || req.body?.storeId;
      if (!storeId) {
        return res.status(400).json({ success: false, error: 'Missing storeId' });
      }

      await query('DELETE FROM stores WHERE id = $1', [String(storeId)]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Error in /api/stores:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
