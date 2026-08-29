import { query } from './db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { stores = [], categories = [] } = req.body || {};

    let seededStoresCount = 0;
    let seededCategoriesCount = 0;

    if (Array.isArray(stores) && stores.length > 0) {
      for (const store of stores) {
        if (store?.id) {
          await query(
            `INSERT INTO stores (id, name, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [store.id, store.name || '', JSON.stringify(store)]
          );
          seededStoresCount++;
        }
      }
    }

    if (Array.isArray(categories) && categories.length > 0) {
      for (const cat of categories) {
        if (cat?.id) {
          await query(
            `INSERT INTO categories (id, name, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [cat.id, cat.name || '', JSON.stringify(cat)]
          );
          seededCategoriesCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${seededStoresCount} stores and ${seededCategoriesCount} categories into PostgreSQL.`,
    });
  } catch (error: any) {
    console.error('Error in /api/seed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
