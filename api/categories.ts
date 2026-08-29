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
    // GET /api/categories
    if (req.method === 'GET') {
      const result = await query('SELECT data FROM categories ORDER BY id ASC');
      const formattedCategories = result.rows.map((row: any) => row.data);

      return res.status(200).json({ success: true, categories: formattedCategories });
    }

    // POST /api/categories (Save array of categories or single category)
    if (req.method === 'POST') {
      const body = req.body;
      const categoriesToSave = Array.isArray(body) ? body : [body];

      for (const cat of categoriesToSave) {
        if (cat && cat.id) {
          await query(
            `INSERT INTO categories (id, name, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [cat.id, cat.name || '', JSON.stringify(cat)]
          );
        }
      }

      return res.status(200).json({ success: true });
    }

    // DELETE /api/categories
    if (req.method === 'DELETE') {
      const categoryId = req.query.categoryId || req.body?.categoryId;
      if (!categoryId) {
        return res.status(400).json({ success: false, error: 'Missing categoryId' });
      }

      await query('DELETE FROM categories WHERE id = $1', [String(categoryId)]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Error in /api/categories:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
