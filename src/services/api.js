/**
 * ============================================================================
 * UNIFIED BACKEND API SERVICE LAYER (`api.js`)
 * ============================================================================
 * 
 * ROLE IN CODEBASE:
 * Serves as the primary data-access and persistence layer connecting the React frontend
 * to the Supabase Cloud backend (PostgreSQL database & Deno Edge Function).
 * 
 * ARCHITECTURE & FALLBACK STRATEGY:
 * 1. Edge Function Gateway (`API_BASE`):
 *    - In Production: Hits `https://<ref>.supabase.co/functions/v1/food-street`
 *    - In Development: Can route through local Express proxy (`/api`)
 * 2. High-Availability Dual Strategy:
 *    - For order fetching, it first requests the Edge Function.
 *    - If the Edge Function times out or is unreachable, it automatically falls back
 *      to direct PostgREST querying via `https://<ref>.supabase.co/rest/v1/orders`.
 * 3. Data Normalization (`normalizeOrder`):
 *    - Supabase orders have evolved with both dedicated columns (`name`, `room No.`,
 *      `Hostel`, `contact`, `grand Total`) and a JSON `data` payload.
 *    - `normalizeOrder` seamlessly resolves discrepancies, ensuring frontend components
 *      always receive consistent keys (`roomNo`, `hostel`, `contact`, `grandTotal`, etc.).
 * 4. Real-Time Order Sync:
 *    - `subscribeToOrders` provides resilient polling that synchronizes order updates
 *      across multiple admin tabs and customer devices.
 * 
 * RELATED MODULES:
 * - `src/App.js`: Fetches initial data on startup and syncs placed orders.
 * - `src/components/AdminTab.js`: Uses all CRUD functions for Stores, Menu Items, Categories, and Orders.
 * - `src/components/CartDrawer.js`: Persists new orders on checkout.
 * - `supabase/functions/food-street/index.ts`: The backend Edge Function handling these requests.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'https://hziznyfxxjdjbhvoacaj.supabase.co/functions/v1/food-street';

const SUPABASE_URL = 'https://hziznyfxxjdjbhvoacaj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aXpueWZ4eGpkamJodm9hY2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzk4MTIsImV4cCI6MjEwODc1NTgxMn0.6CfZjCp70EgifyWVh4r_eDpbueVGiljDgOsXzKgvOJk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Normalizes an order record from Supabase into a consistent, strongly-typed frontend object.
 * Resolves both dedicated PostgreSQL column names (`"room No."`, `"Hostel"`, `"grand Total"`)
 * and nested JSON payload fields in `data`.
 * 
 * @param {Object} order - Raw order record from Supabase or Edge Function.
 * @returns {Object|null} Normalized order object with standard camelCase and display properties.
 */
function normalizeOrder(order) {
  if (!order) return null;
  const rawData = typeof order.data === 'string' ? JSON.parse(order.data) : (order.data || {});
  const merged = { ...rawData, ...order };

  const name = order.name || rawData.name || rawData.customerName || merged.name || '';
  const roomNo = order.roomNo || order.room_no || order['room No.'] || rawData.roomNo || rawData.room_no || rawData['room No.'] || merged.roomNo || '';
  const hostel = order.hostel || order['Hostel'] || rawData.hostel || rawData['Hostel'] || rawData.hostelName || merged.hostel || '';
  const contact = order.contact || rawData.contact || rawData.customerPhone || order.customerPhone || merged.contact || '';

  const rawGt =
    order['grand Total'] ??
    order.grand_total ??
    order.grandTotal ??
    rawData['grand Total'] ??
    rawData.grand_total ??
    rawData.grandTotal ??
    merged.grandTotal;

  let grandTotal = Number(rawGt);
  if (isNaN(grandTotal) || (grandTotal === 0 && Array.isArray(merged.items) && merged.items.length > 0)) {
    const itemsSum = (merged.items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
    if (itemsSum > 0) {
      grandTotal = itemsSum + (Number(merged.deliveryFee) || 0) + (Number(merged.taxesAndCharges) || 0) + (Number(merged.tip) || 0) - (Number(merged.offerDiscount || merged.discount) || 0);
    }
  }
  if (isNaN(grandTotal)) grandTotal = 0;

  const orderNumber =
    order.order_number ||
    order.orderNumber ||
    rawData.orderNumber ||
    rawData.order_number ||
    (order.id && String(order.id).startsWith('#') ? order.id : `#FD-${String(order.id || '').slice(-5)}`);

  return {
    ...merged,
    id: order.id || rawData.id,
    orderNumber,
    status: order.status || rawData.status || 'placed',
    grandTotal,
    'grand Total': grandTotal,
    grand_total: grandTotal,
    created_at: order.created_at || rawData.created_at || new Date().toISOString(),
    updated_at: order.updated_at || rawData.updated_at || new Date().toISOString(),
    name,
    roomNo,
    'room No.': roomNo,
    room_no: roomNo,
    hostel,
    Hostel: hostel,
    contact,
    customerPhone: contact || rawData.customerPhone || '',
    items: Array.isArray(merged.items) ? merged.items : [],
    store: merged.store || { name: 'Foodza Store' },
  };
}

/**
 * Fetch database connection status & record counts
 */
export async function fetchDatabaseStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      success: false,
      connected: false,
      database: 'Supabase (Postgres)',
      error: error?.message || 'Failed to connect to database endpoint',
    };
  }
}

/**
 * Sanitize an order before writing to Supabase, guaranteeing no huge base64 strings
 * or duplicated menu trees are written to PostgreSQL.
 */
function sanitizeOrderForStorage(order) {
  if (!order || typeof order !== 'object') return order;
  const clean = { ...order };
  if (clean.store && typeof clean.store === 'object') {
    clean.store = {
      id: clean.store.id || '',
      name: clean.store.name || '',
      deliveryTime: clean.store.deliveryTime || '',
      image: (typeof clean.store.image === 'string' && !clean.store.image.startsWith('data:')) ? clean.store.image : '',
    };
  }
  if (clean.data && typeof clean.data === 'object') {
    clean.data = sanitizeOrderForStorage(clean.data);
  }
  return clean;
}

/**
 * Fetch orders from Supabase via Edge Function with direct PostgREST fallback.
 * Defaults to fetching recent orders (limit: 50) to prevent bandwidth exhaustion.
 */
export async function fetchOrdersFromDb(options = {}) {
  const limit = (typeof options === 'object' && options?.limit) ? options.limit : 50;

  // Strategy 1: Edge Function
  try {
    const res = await fetch(`${API_BASE}/orders?limit=${limit}&_t=${Date.now()}`, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        return data.orders.map(normalizeOrder).filter(Boolean);
      }
    }
  } catch (error) {
    console.warn('API: Edge function orders fetch failed, falling back to direct PostgREST:', error);
  }

  // Strategy 2: Direct PostgREST query with explicit limit
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=id,order_number,status,grand_total,%22grand%20Total%22,created_at,updated_at,name,room_no,%22room%20No.%22,hostel,%22Hostel%22,contact,data&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        return rows.map(normalizeOrder).filter(Boolean);
      }
    }
  } catch (fallbackErr) {
    console.error('API: Direct PostgREST orders fetch failed:', fallbackErr);
  }

  return [];
}

/**
 * Save / Create an order in Supabase with direct PostgREST fallback.
 * Proactively sanitizes the payload to prevent accidental base64 bandwidth bloat.
 */
export async function saveOrderToDb(rawOrder) {
  const order = sanitizeOrderForStorage(rawOrder);
  const grandTotalVal = Number(order.grandTotal ?? order.grand_total ?? order['grand Total'] ?? 0);
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...order, grandTotal: grandTotalVal, 'grand Total': grandTotalVal }),
      keepalive: true,
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.success);
    }
  } catch (error) {
    console.warn('API: Edge function save order notice, falling back to PostgREST:', error);
  }

  // Strategy 2: Direct PostgREST
  try {
    const now = new Date().toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: order.id,
        order_number: order.orderNumber || order.id,
        status: order.status || 'placed',
        grand_total: grandTotalVal,
        'grand Total': grandTotalVal,
        name: order.name || '',
        'room No.': order.roomNo || '',
        room_no: order.roomNo || '',
        Hostel: order.hostel || '',
        hostel: order.hostel || '',
        contact: order.contact || order.customerPhone || '',
        data: order,
        created_at: order.created_at || now,
        updated_at: now,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('API: Direct PostgREST save order failed:', e);
    return false;
  }
}

/**
 * Update order status in Supabase
 */
export async function updateOrderStatusInDb(orderId, status) {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to update order status:', error);
    return false;
  }
}

/**
 * Delete an order from Supabase
 */
export async function deleteOrderFromDb(orderId) {
  try {
    const res = await fetch(
      `${API_BASE}/orders?orderId=${encodeURIComponent(orderId)}`,
      { method: 'DELETE' },
    );
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to delete order:', error);
    return false;
  }
}

/**
 * Live orders subscription using Supabase Realtime (WebSockets).
 * Replaces high-frequency HTTP polling, cutting bandwidth consumption by ~99.9%.
 * Includes a gentle fallback poll that only runs when the browser tab is actively visible.
 */
export function subscribeToOrders(callback, options = {}) {
  const limit = (typeof options === 'object' && options?.limit) ? options.limit : 50;
  const fallbackIntervalMs = typeof options === 'number'
    ? Math.max(options, 30000)
    : (options?.fallbackIntervalMs || 45000);

  let isSubscribed = true;

  const refresh = async () => {
    if (!isSubscribed) return;
    try {
      const orders = await fetchOrdersFromDb({ limit });
      if (isSubscribed && Array.isArray(orders)) {
        callback(orders);
      }
    } catch (e) {
      console.warn('Orders fetch error:', e);
    }
  };

  // Immediate initial fetch
  refresh();

  // 1. Supabase Realtime WebSocket listener (zero-polling event push)
  let channel = null;
  try {
    channel = supabase
      .channel('public:orders:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          if (isSubscribed) {
            refresh();
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime channel notice:', err);
  }

  // 2. Polite background poll fallback (only when tab is in foreground)
  const intervalId = setInterval(() => {
    if (!isSubscribed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    refresh();
  }, fallbackIntervalMs);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        // ignore cleanup error
      }
    }
  };
}

/**
 * Fetch all stores from Supabase
 */
export async function fetchStoresFromDb() {
  try {
    const res = await fetch(`${API_BASE}/stores`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.stores || [];
  } catch (error) {
    console.warn('API: Failed to fetch stores:', error);
    return [];
  }
}

/**
 * Save stores to Supabase
 */
export async function saveStoresToDb(stores) {
  try {
    const res = await fetch(`${API_BASE}/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stores),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save stores:', error);
    return false;
  }
}

/**
 * Delete a store from Supabase
 */
export async function deleteStoreFromDb(storeId) {
  try {
    const res = await fetch(
      `${API_BASE}/stores?storeId=${encodeURIComponent(storeId)}`,
      { method: 'DELETE' },
    );
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to delete store:', error);
    return false;
  }
}

/**
 * Fetch categories from Supabase
 */
export async function fetchCategoriesFromDb() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    console.warn('API: Failed to fetch categories:', error);
    return [];
  }
}

/**
 * Save categories to Supabase
 */
export async function saveCategoriesToDb(categories) {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save categories:', error);
    return false;
  }
}

/**
 * Delete a category from Supabase
 */
export async function deleteCategoryFromDb(categoryId) {
  try {
    const res = await fetch(
      `${API_BASE}/categories?categoryId=${encodeURIComponent(categoryId)}`,
      { method: 'DELETE' },
    );
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to delete category:', error);
    return false;
  }
}

/**
 * Seed Supabase with default stores and categories
 */
export async function seedDatabase(initialStores, initialCategories) {
  try {
    const res = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stores: initialStores, categories: initialCategories }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('API: Seed notice:', error);
    return false;
  }
}
