// ─── API Service ─────────────────────────────────────────────────────────────
// All backend calls go through the Supabase Edge Function.
// In development you can override this with VITE_API_BASE (e.g. /api for the
// local Express proxy).  In production it points to the deployed Edge Function.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'https://pdteqhpihbgxcsyrxdgj.supabase.co/functions/v1/food-street';

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
 * Fetch all orders from Supabase via the Edge Function
 */
export async function fetchOrdersFromDb() {
  try {
    const res = await fetch(`${API_BASE}/orders?_t=${Date.now()}`, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.orders || [];
  } catch (error) {
    console.warn('API: Failed to fetch orders:', error);
    return [];
  }
}

/**
 * Save / Create an order in Supabase
 */
export async function saveOrderToDb(order) {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
      keepalive: true,
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save order:', error);
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
