/**
 * @file safeStorage.js
 * @module utils/safeStorage
 * @description
 * Safe LocalStorage helper with QuotaExceeded protection.
 * Prevents unhandled DOMException quota crashes when storing large DB data.
 * Exported from its own file so Vite HMR can Fast Refresh App.js correctly.
 */

export const safeStorage = {
    getItem: (key) => {
        try {
            return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn(`[SafeStorage] Failed to set "${key}":`, e);
            try {
                // If quota exceeded, purge non-critical bloated caches and retry
                localStorage.removeItem('food_street_orders');
                localStorage.setItem(key, value);
            } catch {
                // Safely drop without crashing React
            }
        }
    },
    removeItem: (key) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch {}
    }
};
