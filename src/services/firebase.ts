import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  Firestore
} from 'firebase/firestore';
import { Order, Store, Category, OrderStatus } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyCBrn54Tbfnd8L7f0Jm1kCjl1gx91cAerU",
  authDomain: "food-connect-461dd.firebaseapp.com",
  projectId: "food-connect-461dd",
  storageBucket: "food-connect-461dd.firebasestorage.app",
  messagingSenderId: "925486679911",
  appId: "1:925486679911:web:bf0063ede36696cdb651c2",
};

// Check environment variables, local storage, or default for config
export function getStoredFirebaseConfig(): FirebaseConfig {
  try {
    const saved = localStorage.getItem('food_street_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stored firebase config', e);
  }

  // Fallback to import.meta.env Vite variables
  const env = (import.meta as any)?.env || {};
  if (env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem('food_street_firebase_config', JSON.stringify(config));
}

let dbInstance: Firestore | null = null;

export function getFirestoreDB(): Firestore | null {
  if (dbInstance) return dbInstance;

  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase Firestore:', err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return getStoredFirebaseConfig() !== null;
}

// -------------------------------------------------------------
// Real-Time Orders Operations
// -------------------------------------------------------------

export async function saveOrderToFirestore(order: Order): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const orderDoc = doc(db, 'orders', order.id);
    await setDoc(orderDoc, {
      ...order,
      createdAtTimestamp: Date.now(),
    });
    return true;
  } catch (error) {
    console.error('Error saving order to Firestore:', error);
    return false;
  }
}

export async function updateOrderStatusInFirestore(orderId: string, status: OrderStatus): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const orderDoc = doc(db, 'orders', orderId);
    await updateDoc(orderDoc, { status, updatedAtTimestamp: Date.now() });
    return true;
  } catch (error) {
    console.error('Error updating order status in Firestore:', error);
    return false;
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const orderDoc = doc(db, 'orders', orderId);
    await deleteDoc(orderDoc);
    return true;
  } catch (error) {
    console.error('Error deleting order from Firestore:', error);
    return false;
  }
}

export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  const db = getFirestoreDB();
  if (!db) {
    return () => {};
  }

  try {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAtTimestamp', 'desc'));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const liveOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          liveOrders.push(docSnap.data() as Order);
        });
        callback(liveOrders);
      },
      (error) => {
        console.warn('Firestore orders subscription notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to setup orders subscription:', err);
    return () => {};
  }
}

// -------------------------------------------------------------
// Real-Time Stores Operations
// -------------------------------------------------------------

export async function saveStoresToFirestore(stores: Store[]): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    for (const store of stores) {
      await setDoc(doc(db, 'stores', store.id), store);
    }
    return true;
  } catch (error) {
    console.error('Error saving stores to Firestore:', error);
    return false;
  }
}

export function subscribeToStores(callback: (stores: Store[]) => void): () => void {
  const db = getFirestoreDB();
  if (!db) return () => {};

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'stores'),
      (snapshot) => {
        if (!snapshot.empty) {
          const liveStores: Store[] = [];
          snapshot.forEach((docSnap) => {
            liveStores.push(docSnap.data() as Store);
          });
          callback(liveStores);
        }
      },
      (error) => {
        console.warn('Firestore stores subscription notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to setup stores subscription:', err);
    return () => {};
  }
}

// -------------------------------------------------------------
// Real-Time Categories Operations
// -------------------------------------------------------------

export async function saveCategoriesToFirestore(categories: Category[]): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    for (const cat of categories) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }
    return true;
  } catch (error) {
    console.error('Error saving categories to Firestore:', error);
    return false;
  }
}

export function subscribeToCategories(callback: (categories: Category[]) => void): () => void {
  const db = getFirestoreDB();
  if (!db) return () => {};

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const liveCategories: Category[] = [];
          snapshot.forEach((docSnap) => {
            liveCategories.push(docSnap.data() as Category);
          });
          callback(liveCategories);
        }
      },
      (error) => {
        console.warn('Firestore categories subscription notice:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to setup categories subscription:', err);
    return () => {};
  }
}
