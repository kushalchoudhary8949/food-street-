import { Order, Store, Category, OrderStatus } from '../types';

const API_BASE = '/api';

export interface DatabaseStatus {
  success: boolean;
  connected: boolean;
  database: string;
  counts?: {
    stores: number;
    categories: number;
    orders: number;
  };
  error?: string;
}

/**
 * Fetch database connection status & record counts
 */
export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      connected: false,
      database: 'PostgreSQL',
      error: error?.message || 'Failed to connect to database endpoint',
    };
  }
}

/**
 * Fetch all orders from PostgreSQL via Serverless API
 */
export async function fetchOrdersFromDb(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.orders || [];
  } catch (error) {
    console.warn('API: Failed to fetch orders from PostgreSQL:', error);
    return [];
  }
}

/**
 * Save / Create an order in PostgreSQL
 */
export async function saveOrderToDb(order: Order): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save order to PostgreSQL:', error);
    return false;
  }
}

/**
 * Update order status in PostgreSQL
 */
export async function updateOrderStatusInDb(orderId: string, status: OrderStatus): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to update order status in PostgreSQL:', error);
    return false;
  }
}

/**
 * Delete an order from PostgreSQL
 */
export async function deleteOrderFromDb(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/orders?orderId=${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to delete order from PostgreSQL:', error);
    return false;
  }
}

/**
 * Live polling subscription for real-time orders update (default: every 3.5 seconds)
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  intervalMs = 3500
): () => void {
  let isSubscribed = true;

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const orders = await fetchOrdersFromDb();
      if (isSubscribed && orders && orders.length > 0) {
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
 * Fetch all stores from PostgreSQL
 */
export async function fetchStoresFromDb(): Promise<Store[]> {
  try {
    const res = await fetch(`${API_BASE}/stores`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.stores || [];
  } catch (error) {
    console.warn('API: Failed to fetch stores from PostgreSQL:', error);
    return [];
  }
}

/**
 * Save stores to PostgreSQL
 */
export async function saveStoresToDb(stores: Store[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stores),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save stores to PostgreSQL:', error);
    return false;
  }
}

/**
 * Fetch categories from PostgreSQL
 */
export async function fetchCategoriesFromDb(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    console.warn('API: Failed to fetch categories from PostgreSQL:', error);
    return [];
  }
}

/**
 * Save categories to PostgreSQL
 */
export async function saveCategoriesToDb(categories: Category[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.error('API: Failed to save categories to PostgreSQL:', error);
    return false;
  }
}

/**
 * Seed PostgreSQL with default stores and categories if not already seeded
 */
export async function seedDatabase(initialStores: Store[], initialCategories: Category[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stores: initialStores, categories: initialCategories }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('API: Auto-seed notice:', error);
    return false;
  }
}
