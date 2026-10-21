// ─── API Service ─────────────────────────────────────────────────────────────
// All backend calls go through the Supabase Edge Function.
// In development you can override this with VITE_API_BASE (e.g. /api for the
// local Express proxy).  In production it points to the deployed Edge Function.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'https://pdteqhpihbgxcsyrxdgj.supabase.co/functions/v1/food-street';

const SUPABASE_URL = 'https://pdteqhpihbgxcsyrxdgj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdGVxaHBpaGJneGNzeXJ4ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDk3MzUsImV4cCI6MjEwNzYyNTczNX0.rHBIJMJyvHHPWO5Zh5awwBthVXyNFIj5GuBrJoi4Zhw';

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
 * Fetch all orders from Supabase via Edge Function with direct PostgREST fallback
 */
export async function fetchOrdersFromDb() {
  // Strategy 1: Edge Function
  try {
    const res = await fetch(`${API_BASE}/orders?_t=${Date.now()}`, {
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

  // Strategy 2: Direct PostgREST query
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=id,order_number,status,grand_total,%22grand%20Total%22,created_at,updated_at,name,room_no,%22room%20No.%22,hostel,%22Hostel%22,contact,data&order=created_at.desc`,
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
 * Save / Create an order in Supabase with direct PostgREST fallback
 */
export async function saveOrderToDb(order) {
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
 * Live polling subscription for real-time orders update (default: every 3.5 seconds)
 */
export function subscribeToOrders(callback, intervalMs = 3500) {
  let isSubscribed = true;
  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const orders = await fetchOrdersFromDb();
      if (isSubscribed && Array.isArray(orders)) {
        callback(orders);
      }
    } catch (e) {
      console.warn('Orders poll notice:', e);
    }
  };
  // Immediate initial fetch
  poll();
  const intervalId = setInterval(poll, intervalMs);
  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
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
