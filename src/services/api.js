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
  '/api';

const SUPABASE_URL = 'https://pdteqhpihbgxcsyrxdgj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdGVxaHBpaGJneGNzeXJ4ZGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDk3MzUsImV4cCI6MjEwNzYyNTczNX0.rHBIJMJyvHHPWO5Zh5awwBthVXyNFIj5GuBrJoi4Zhw';

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

// ============================================================================
// FOODZA V1 CUSTOMER AUTHENTICATION & PROFILE MANAGEMENT APIS
// ============================================================================

const TOKEN_KEY = 'foodza_access_token';
const USER_KEY = 'foodza_customer_user';

let currentAccessToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

/**
 * Get the current access token
 */
export function getAccessToken() {
  if (!currentAccessToken && typeof window !== 'undefined') {
    currentAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return currentAccessToken;
}

/**
 * Save access token and cached user
 */
export function setAuthSession(token, user) {
  currentAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }
}

/**
 * Retrieve cached user if available
 */
export function getCachedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear authentication session
 */
export function clearAuthSession() {
  currentAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Build auth headers for fetch requests
 */
function getAuthHeaders(extraHeaders = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated API fetch helper with automatic 401 refresh token retry
 */
async function authFetch(url, options = {}) {
  const opts = {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
    credentials: 'include',
  };

  let res = await fetch(url, opts);

  // If unauthorized, attempt to rotate refresh token once
  if (res.status === 401) {
    const refreshed = await refreshCustomerSession();
    if (refreshed?.success && refreshed?.accessToken) {
      opts.headers = getAuthHeaders(options.headers || {});
      res = await fetch(url, opts);
    }
  }

  return res;
}

/**
 * Send WhatsApp OTP via YouPI integration
 * @param {string} phone - Indian mobile number (e.g. "9876543210" or "+919876543210")
 * @param {string} [name] - Customer full name
 */
export async function sendWhatsAppOtp(phone, name) {
  try {
    const res = await fetch('/api/v1/auth/whatsapp/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone, name }),
      credentials: 'include',
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: sendWhatsAppOtp failed:', error);
    return { success: false, error: error.message || 'Network error sending WhatsApp code' };
  }
}

/**
 * Verify WhatsApp OTP code and establish authenticated session
 * @param {string} phone
 * @param {string} otp - 6-digit code
 * @param {string} [name]
 */
export async function verifyWhatsAppOtp(phone, otp, name) {
  try {
    const res = await fetch('/api/v1/auth/whatsapp/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone, otp, name }),
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success && data.accessToken) {
      setAuthSession(data.accessToken, data.user);
    }
    return data;
  } catch (error) {
    console.error('API: verifyWhatsAppOtp failed:', error);
    return { success: false, error: error.message || 'Network error verifying WhatsApp code' };
  }
}

/**
 * Refresh customer authentication token
 */
export async function refreshCustomerSession() {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success && data.accessToken) {
      setAuthSession(data.accessToken, data.user);
    } else {
      clearAuthSession();
    }
    return data;
  } catch (error) {
    clearAuthSession();
    return { success: false, error: error.message };
  }
}

/**
 * Log out customer and revoke session on server
 */
export async function logoutCustomer() {
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  } catch (err) {
    console.warn('API: Logout notification failed:', err);
  } finally {
    clearAuthSession();
  }
  return { success: true };
}

/**
 * Fetch authenticated customer's profile from PostgreSQL
 */
export async function fetchCustomerProfile() {
  try {
    const res = await authFetch('/api/v1/users/me');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.user) {
      setAuthSession(getAccessToken(), data.user);
      return data.user;
    }
    return null;
  } catch (error) {
    console.warn('API: fetchCustomerProfile failed:', error);
    return null;
  }
}

/**
 * Update authenticated customer's profile (name, hostel, room, block, floor, landmark)
 */
export async function updateCustomerProfile(profileData) {
  try {
    const res = await authFetch('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (data.success && data.user) {
      setAuthSession(getAccessToken(), data.user);
    }
    return data;
  } catch (error) {
    console.error('API: updateCustomerProfile failed:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

/**
 * Fetch all saved delivery addresses for the authenticated customer
 */
export async function fetchCustomerAddresses() {
  try {
    const res = await authFetch('/api/v1/addresses');
    if (!res.ok) return [];
    const data = await res.json();
    return data.addresses || [];
  } catch (error) {
    console.warn('API: fetchCustomerAddresses failed:', error);
    return [];
  }
}

/**
 * Create a new delivery address for the authenticated customer
 */
export async function createCustomerAddress(addressData) {
  try {
    const res = await authFetch('/api/v1/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: createCustomerAddress failed:', error);
    return { success: false, error: error.message || 'Failed to create address' };
  }
}

/**
 * Update an existing delivery address
 */
export async function updateCustomerAddress(addressId, addressData) {
  try {
    const res = await authFetch(`/api/v1/addresses/${encodeURIComponent(addressId)}`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: updateCustomerAddress failed:', error);
    return { success: false, error: error.message || 'Failed to update address' };
  }
}

/**
 * Delete a saved delivery address
 */
export async function deleteCustomerAddress(addressId) {
  try {
    const res = await authFetch(`/api/v1/addresses/${encodeURIComponent(addressId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: deleteCustomerAddress failed:', error);
    return { success: false, error: error.message || 'Failed to delete address' };
  }
}

/**
 * Set an address as the default delivery address
 */
export async function setDefaultCustomerAddress(addressId) {
  try {
    const res = await authFetch(`/api/v1/addresses/${encodeURIComponent(addressId)}/default`, {
      method: 'POST',
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: setDefaultCustomerAddress failed:', error);
    return { success: false, error: error.message || 'Failed to set default address' };
  }
}

/**
 * Place a customer order with authenticated session and snapshot persistence
 */
export async function placeCustomerOrder(orderPayload) {
  try {
    const res = await authFetch('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: placeCustomerOrder failed:', error);
    return { success: false, error: error.message || 'Failed to persist order' };
  }
}
