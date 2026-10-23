/**
 * ============================================================================
 * FOODZA MASTER APPLICATION ORCHESTRATOR (`App.js`)
 * ============================================================================
 * 
 * ROLE IN CODEBASE:
 * This is the central root component of FoodZa. It holds global client state,
 * manages synchronization between LocalStorage and Supabase Cloud, controls
 * navigation/routing (Storefront vs. Admin Portal), and coordinates cart/order flows.
 * 
 * KEY STATE & SUB-SYSTEMS:
 * 1. Data Hydration & Versioning:
 *    - `stores`: List of restaurants with menus, operating hours, discounts, and visibility.
 *    - `categories`: Horizontal category taxonomy (Pizzas, Burgers, Biryani, etc.).
 *    - `DATA_VERSION`: Cache invalidation key that forces a fresh pull if schemas change.
 * 2. Cloud Synchronization:
 *    - On mount: Concurrently fetches latest stores, categories, and orders from Supabase.
 *    - Real-Time: Subscribes to order updates via polling listener (`subscribeToOrders`).
 * 3. Routing & Dual Modes:
 *    - Storefront Mode: Tabs for `home`, `search`, `orders`, `profile`.
 *    - Admin Portal Mode: Triggered via URL hash (`#admin`) or Profile link.
 *      Protected by `AdminLogin` with cryptographic session verification (`verifyAdminSession`).
 * 4. Cart & Checkout Engine:
 *    - Handles item customizations (addons, veg/non-veg tags).
 *    - Validates order windows and operating hours before allowing checkout.
 *    - Computes item totals, platform fee, taxes, tips, and store offer discounts.
 *    - Dispatches confirmed orders to Supabase and opens formatted WhatsApp receipt.
 * 5. Customer Privacy & Isolation:
 *    - `customerOrders`: Filters orders so customers only see their placed orders on their device.
 * 6. Store Visibility Control:
 *    - Admin-controlled `isVisible` flag excludes disabled stores from customer home & search.
 * 
 * RELATED MODULES:
 * - `src/components/Header.js`: App banner, location picker, and global search trigger.
 * - `src/components/StoreCard.js` & `StoreDetailModal.js`: Restaurant storefront display.
 * - `src/components/CartDrawer.js`: Checkout slide-over drawer.
 * - `src/components/AdminTab.js`: Back-office management portal.
 * - `src/services/api.js`: Supabase Cloud backend API service.
 * ============================================================================
 */

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { BITE_ADDA_STORE_ID, getGraduateBiryaniOrderWindowStatus, getOrderWindowStatus, OPEN_STORE_ID, TUMMY_TREAT_STORE_ID, setStoreStatusCache } from './utils/orderTiming';
import { Header } from './components/Header';
import { CategoryBar } from './components/CategoryBar';
import { StoreCard } from './components/StoreCard';
import { StoreDetailModal } from './components/StoreDetailModal';
import { MenuItemModal } from './components/MenuItemModal';
import { CartDrawer } from './components/CartDrawer';
import { LocationModal } from './components/LocationModal';
import { BottomNav } from './components/BottomNav';
import { SearchTab } from './components/SearchTab';
import { OrdersTab } from './components/OrdersTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminTab } from './components/AdminTab';
import { AdminLogin } from './components/AdminLogin';
import { TummyTreatAdmin } from './components/TummyTreatAdmin';
import { sendOrderToWhatsApp } from './utils/whatsapp';
import { CATEGORIES, STORES, INITIAL_ADDRESSES, INITIAL_ORDERS, DATA_VERSION } from './data/mockData';
import { fetchStoresFromDb, fetchCategoriesFromDb, fetchOrdersFromDb, saveStoresToDb, saveCategoriesToDb, saveOrderToDb } from './services/api';
import { verifyAdminSession, clearAdminSession } from './utils/adminAuth';

// Local storage keys for saved delivery addresses
const ADDRESS_STORAGE_KEY = 'food_street_addresses';
const CURRENT_ADDRESS_STORAGE_KEY = 'food_street_current_address';

// -------------------------------------------------------------
// Safe LocalStorage Helper with QuotaExceeded Protection
// Prevents unhandled DOMException quota crashes when storing DB data
// -------------------------------------------------------------
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

// Proactively remove orders from client localStorage to permanently prevent quota exhaustion
try {
    localStorage.removeItem('food_street_orders');
} catch {}

export default function App() {
    // Load initial states from localStorage if available (invalidates on data version mismatch)
    const [stores, setStores] = useState(() => {
        const savedVersion = safeStorage.getItem('food_street_version');
        if (savedVersion !== DATA_VERSION) {
            safeStorage.setItem('food_street_version', DATA_VERSION);
            safeStorage.setItem('food_street_stores', JSON.stringify(STORES));
            safeStorage.setItem('food_street_categories', JSON.stringify(CATEGORIES));
            return STORES;
        }
        const saved = safeStorage.getItem('food_street_stores');
        return saved ? JSON.parse(saved) : STORES;
    });
    const [categories, setCategories] = useState(() => {
        const savedVersion = safeStorage.getItem('food_street_version');
        if (savedVersion !== DATA_VERSION) {
            return CATEGORIES;
        }
        const saved = safeStorage.getItem('food_street_categories');
        return saved ? JSON.parse(saved) : CATEGORIES;
    });
    // Orders are strictly fetched from and synchronized with Supabase DB (not stored in client localStorage)
    const [orders, setOrders] = useState(() => INITIAL_ORDERS);

    // Ensure fresh stores and categories are loaded when version changes
    React.useEffect(() => {
        const savedVersion = safeStorage.getItem('food_street_version');
        if (savedVersion !== DATA_VERSION) {
            safeStorage.setItem('food_street_version', DATA_VERSION);
            safeStorage.setItem('food_street_stores', JSON.stringify(STORES));
            safeStorage.setItem('food_street_categories', JSON.stringify(CATEGORIES));
            setStores(STORES);
            setCategories(CATEGORIES);
        }
        // Auto-fetch latest stores & categories from live Supabase database
        let isMounted = true;
        (async () => {
            try {
                const [dbStores, dbCats, dbOrders] = await Promise.all([
                    fetchStoresFromDb(),
                    fetchCategoriesFromDb(),
                    fetchOrdersFromDb(),
                ]);
                if (!isMounted) return;
                if (Array.isArray(dbStores) && dbStores.length > 0) {
                    setStores((prevStores) => {
                        const storeMap = new Map();
                        dbStores.forEach(s => storeMap.set(s.id, s));
                        // Retain any locally added store that hasn't synced yet
                        prevStores.forEach(s => {
                            if (!storeMap.has(s.id)) {
                                storeMap.set(s.id, s);
                            }
                        });
                        return Array.from(storeMap.values());
                    });
                }
                if (Array.isArray(dbCats) && dbCats.length > 0) {
                    setCategories(dbCats);
                }
                if (Array.isArray(dbOrders) && dbOrders.length > 0) {
                    setOrders((prevOrders) => {
                        const orderMap = new Map();
                        dbOrders.forEach(o => orderMap.set(o.id, o));
                        // Retain any locally placed orders not yet in DB
                        prevOrders.forEach(o => {
                            if (!orderMap.has(o.id)) {
                                orderMap.set(o.id, o);
                                saveOrderToDb(o).catch(() => {});
                            }
                        });
                        return Array.from(orderMap.values());
                    });
                }
            } catch (err) {
                console.warn('Initial cloud fetch notice:', err);
            }
        })();
        return () => { isMounted = false; };
    }, []);
    // Save stores and categories to localStorage when they change
    React.useEffect(() => {
        safeStorage.setItem('food_street_stores', JSON.stringify(stores));
        setStoreStatusCache(stores);
    }, [stores]);
    React.useEffect(() => {
        safeStorage.setItem('food_street_categories', JSON.stringify(categories));
    }, [categories]);
    // Note: Orders are NOT stored in localStorage to protect against browser storage quotas
    // Periodically sync orders from Supabase cloud in background
    React.useEffect(() => {
        let isMounted = true;
        const sync = async () => {
            try {
                const dbOrders = await fetchOrdersFromDb();
                if (isMounted && Array.isArray(dbOrders) && dbOrders.length > 0) {
                    setOrders(prevOrders => {
                        const orderMap = new Map();
                        dbOrders.forEach(o => orderMap.set(o.id, o));
                        prevOrders.forEach(o => {
                            if (!orderMap.has(o.id)) {
                                orderMap.set(o.id, o);
                            }
                        });
                        return Array.from(orderMap.values());
                    });
                }
            } catch (e) {}
        };
        const intervalId = setInterval(sync, 4000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);
    // Sync state across open tabs in real-time
    React.useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'food_street_stores' && e.newValue) {
                setStores(JSON.parse(e.newValue));
            }
            if (e.key === 'food_street_categories' && e.newValue) {
                setCategories(JSON.parse(e.newValue));
            }
            if (e.key === ADDRESS_STORAGE_KEY && e.newValue) {
                try {
                    const next = JSON.parse(e.newValue);
                    if (Array.isArray(next))
                        setAddresses(next);
                }
                catch {
                    // ignore invalid data
                }
            }
            if (e.key === CURRENT_ADDRESS_STORAGE_KEY && e.newValue) {
                try {
                    const next = JSON.parse(e.newValue);
                    if (next && next.id)
                        setCurrentAddress(next);
                }
                catch {
                    // ignore invalid data
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    // Hash/Path-based Router State
    const [currentPath, setCurrentPath] = useState(window.location.hash || window.location.pathname);
    React.useEffect(() => {
        const handleLocationChange = () => {
            setCurrentPath(window.location.hash || window.location.pathname);
        };
        window.addEventListener('hashchange', handleLocationChange);
        window.addEventListener('popstate', handleLocationChange);
        return () => {
            window.removeEventListener('hashchange', handleLocationChange);
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, []);
    const isTummyTreat =
        currentPath.startsWith('/tummy-treat') ||
        currentPath.startsWith('#/tummy-treat') ||
        currentPath === '#tummy-treat' ||
        window.location.pathname.startsWith('/tummy-treat') ||
        window.location.hash.startsWith('#/tummy-treat') ||
        window.location.hash === '#tummy-treat';
    const isAdmin =
        currentPath.startsWith('/admin') ||
        currentPath.startsWith('#/admin') ||
        currentPath === '#admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#/admin') ||
        window.location.hash === '#admin' ||
        window.location.search.includes('admin=true');
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    React.useEffect(() => {
        if (!isAdmin) return;
        let isCurrent = true;
        verifyAdminSession().then(isValid => {
            if (isCurrent) {
                setIsAdminAuthenticated(isValid);
            }
        });
        return () => { isCurrent = false; };
    }, [isAdmin, currentPath]);
    // App navigation state
    const [activeTab, setActiveTab] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    React.useEffect(() => {
        const refreshCurrentTime = () => setCurrentTime(new Date());
        const intervalId = window.setInterval(refreshCurrentTime, 60_000);
        return () => window.clearInterval(intervalId);
    }, []);
    // Address state
    const [addresses, setAddresses] = useState(() => {
        if (typeof window === 'undefined')
            return INITIAL_ADDRESSES;
        const saved = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
        if (!saved)
            return INITIAL_ADDRESSES;
        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADDRESSES;
        }
        catch {
            return INITIAL_ADDRESSES;
        }
    });
    const [currentAddress, setCurrentAddress] = useState(() => {
        if (typeof window === 'undefined')
            return INITIAL_ADDRESSES[0];
        const savedAddress = window.localStorage.getItem(CURRENT_ADDRESS_STORAGE_KEY);
        if (savedAddress) {
            try {
                const parsed = JSON.parse(savedAddress);
                if (parsed && parsed.id)
                    return parsed;
            }
            catch {
                // fall through to the persisted addresses list below
            }
        }
        const fallback = addresses[0] ?? INITIAL_ADDRESSES[0];
        return fallback;
    });
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    React.useEffect(() => {
        localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
    }, [addresses]);
    React.useEffect(() => {
        if (currentAddress) {
            localStorage.setItem(CURRENT_ADDRESS_STORAGE_KEY, JSON.stringify(currentAddress));
        }
    }, [currentAddress]);
    // Favorites state
    const [favorites, setFavorites] = useState(['store-kfc', 'store-bbk']);
    // Selected store & modals
    const [selectedStore, setSelectedStore] = useState(null);
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    // Menu item customizer modal
    const [customizingItem, setCustomizingItem] = useState(null);
    const [customizingItemStore, setCustomizingItemStore] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    // Notification Toast
    const [toastMessage, setToastMessage] = useState(null);
    // Pending orders for multi-bill logic
    const [pendingOrders, setPendingOrders] = useState([]);
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };
    // Toggle favorite store
    const handleToggleFavorite = (e, storeId) => {
        if (e)
            e.stopPropagation();
        if (!storeId)
            return;
        if (favorites.includes(storeId)) {
            setFavorites(favorites.filter(id => id !== storeId));
            showToast('Removed from favorites');
        }
        else {
            setFavorites([...favorites, storeId]);
            showToast('Added to favorites');
        }
    };
    // Handle category select
    const handleSelectCategory = (catSlug) => {
        setSelectedCategory(catSlug);
    };
    // Open store details
    const handleOpenStore = (store) => {
        if (store && store.isVisible === false) {
            showToast('This store is currently not available');
            return;
        }
        setSelectedStore(store);
        setIsStoreModalOpen(true);
    };
    // Handle Add to Cart — routes to BZ cart or FS cart based on store
    const handleAddToCart = (item, quantity = 1, selectedAddons = []) => {
        const itemStore = stores.find(s => s.id === item.storeId);
        const orderWindowStatus = getOrderWindowStatus(itemStore || item.storeId);
        if (!orderWindowStatus.isOpen) {
            showToast(orderWindowStatus.message);
            return;
        }
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const isDayRestricted = Array.isArray(item.availableOnDays) && item.availableOnDays.length > 0;
        if (isDayRestricted && !item.availableOnDays.includes(today)) {
            showToast(`Only available on ${item.availableOnDays.join(', ')}`);
            return;
        }
        // Determine exact store / outlet for this item
        let store = customizingItemStore || selectedStore;
        if (store && store.outlets) {
            const outletMatch = store.outlets.find((o) => o.id === item.storeId);
            if (outletMatch)
                store = outletMatch;
        }
        if (!store || (store.id !== item.storeId && !store.outlets)) {
            for (const s of stores) {
                if (s.id === item.storeId) {
                    store = s;
                    break;
                }
                if (s.outlets) {
                    const match = s.outlets.find((o) => o.id === item.storeId);
                    if (match) {
                        store = match;
                        break;
                    }
                }
            }
        }
        if (!store)
            store = stores[0];
        if (!store) {
            showToast('This store is currently unavailable. Please try again later.');
            return;
        }
        if (store.id === 'store-graduate-biryani') {
            const windowStatus = getGraduateBiryaniOrderWindowStatus();
            if (!windowStatus.isOpen) {
                showToast(windowStatus.message);
                return;
            }
        }
        const activeStoreIds = new Set(cartItems.map((cartItem) => cartItem.store.id));
        if (activeStoreIds.size > 0 && (activeStoreIds.size > 1 || !activeStoreIds.has(store.id))) {
            showToast('Orders are possible from one store at a time. Clear your current cart to order from another store.');
            return;
        }
        const uniqueId = `${item.id}-${selectedAddons.map(a => a.id).sort().join('_')}`;
        const newCartItem = { id: uniqueId, item, store, quantity, selectedAddons };
        setCartItems((prev) => {
            const existingIndex = prev.findIndex(ci => ci.id === uniqueId);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
                return updated;
            }
            return [...prev, newCartItem];
        });
        showToast(`Added ${quantity}x ${item.name} to cart`);
    };
    // Update Cart Quantity — searches both carts
    const makeUpdateQuantity = (setCart) => (cartItemIdOrItemId, delta) => {
        setCart((prev) => {
            const index = prev.findIndex(ci => ci.id === cartItemIdOrItemId || ci.item.id === cartItemIdOrItemId);
            if (index === -1)
                return prev;
            const current = prev[index];
            const newQty = current.quantity + delta;
            if (newQty <= 0)
                return prev.filter((_, idx) => idx !== index);
            const copy = [...prev];
            copy[index] = { ...current, quantity: newQty };
            return copy;
        });
    };
    const handleUpdateCartQuantity = makeUpdateQuantity(setCartItems);
    // Generic place order — accepts the cart items for the specific store
    const buildAndPlaceOrder = async (cartItemsForOrder, clearCart, closeCart, { tip, discount, couponCode, instructions, paymentMethod, cancellationConfirmed }, containerChargePerItem = 0) => {
        if (cartItemsForOrder.length === 0)
            return;
        const targetStore = cartItemsForOrder[0]?.store;
        const liveStore = stores.find(s => s.id === targetStore?.id);
        if (liveStore && liveStore.isVisible === false) {
            showToast(`${liveStore.name} is currently not available for orders`);
            return;
        }
        const windowStatus = getOrderWindowStatus(targetStore);
        if (!windowStatus.isOpen) {
            showToast(windowStatus.message);
            return;
        }
        if (cartItemsForOrder[0]?.store.id === 'store-graduate-biryani') {
            const graduateWindowStatus = getGraduateBiryaniOrderWindowStatus();
            if (!graduateWindowStatus.isOpen) {
                showToast(graduateWindowStatus.message);
                return;
            }
        }
        const itemTotal = cartItemsForOrder.reduce((sum, ci) => {
            const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
            return sum + (ci.item.price + addonsCost) * ci.quantity;
        }, 0);
        const totalQuantity = cartItemsForOrder.reduce((sum, ci) => sum + ci.quantity, 0);
        const containerCharge = containerChargePerItem > 0 ? totalQuantity * containerChargePerItem : 0;
        const taxesAndPacking = Number((itemTotal * 0.05).toFixed(2));
        const offerDiscount = discount || 0;
        const deliveryFee = 20;
        const grandTotal = Math.max(0, itemTotal + containerCharge + deliveryFee + taxesAndPacking + tip - (discount || 0));
        const storeMap = new Map();
        cartItemsForOrder.forEach(ci => storeMap.set(ci.store.id, ci.store));
        const uniqueStores = Array.from(storeMap.values());
        const storeName = uniqueStores.length === 1
            ? uniqueStores[0].name
            : uniqueStores.map(s => s.name).join(' & ');
        const storeImage = uniqueStores[0].image;
        const storeId = uniqueStores.map(s => s.id).join('_');
        const formattedAddress = [
            currentAddress.name ? `Name: ${currentAddress.name}` : null,
            currentAddress.roomNo ? `Room ${currentAddress.roomNo}` : null,
            currentAddress.hostelName,
            currentAddress.block,
            currentAddress.addressLine,
            currentAddress.locality,
            currentAddress.city,
        ].filter(Boolean).join(', ');
        const newOrder = {
            id: `ord-${Date.now()}`,
            orderNumber: `#FD-${Math.floor(10000 + Math.random() * 90000)}`,
            name: currentAddress.name || '',
            roomNo: currentAddress.roomNo || '',
            hostel: currentAddress.hostelName || '',
            contact: currentAddress.phone || '',
            store: { id: storeId, name: storeName, image: storeImage, deliveryTime: uniqueStores[0].deliveryTime },
            items: cartItemsForOrder.map(ci => ({
                name: `${ci.item.name} (${ci.store.name})`,
                quantity: ci.quantity,
                price: ci.item.price,
                isVeg: ci.item.isVeg,
                addons: ci.selectedAddons.map(a => a.name),
            })),
            itemTotal,
            deliveryFee,
            offerDiscount,
            discount,
            taxesAndCharges: taxesAndPacking,
            tip,
            grandTotal,
            status: 'confirmed',
            placedAt: 'Just now',
            created_at: new Date().toISOString(),
            estimatedDeliveryTime: 'In ~20 mins',
            deliveryAddress: formattedAddress,
            customerPhone: currentAddress.phone,
            driverName: 'Alex Mercer',
            driverPhone: '8549908385',
            driverRating: 4.9,
            driverPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            paymentMethod: paymentMethod || 'UPI / Online',
            cancellationConfirmed,
        };

        // Instantly save to local React state
        setOrders(prev => [newOrder, ...prev]);
        try {
            // Keep customer order IDs for this browser session to display their placed orders
            const myIds = JSON.parse(localStorage.getItem('food_street_my_order_ids') || '[]');
            if (!myIds.includes(newOrder.id)) {
                localStorage.setItem('food_street_my_order_ids', JSON.stringify([newOrder.id, ...myIds]));
            }
        } catch (e) {}

        clearCart();
        closeCart();
        setIsStoreModalOpen(false);
        setActiveTab('orders');

        // Persist to live Supabase database FIRST so admin panel immediately tracks it
        try {
            await Promise.race([
                saveOrderToDb(newOrder),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
        } catch (err) {
            console.error('Failed to save order to Supabase:', err);
        }

        // Direct to WhatsApp with official order receipt & order ID
        sendOrderToWhatsApp(newOrder);
        showToast(`🎉 Order ${newOrder.orderNumber} placed & sent to WhatsApp!`);
    };
    const containerChargePerItem = ['store-biriyani-zone', 'store-ssv', 'store-jawa-hut', 'store-taj-biriyani', 'store-graduate-biryani'].includes(cartItems[0]?.store.id ?? '') ? 10 : 0;
    const handlePlaceOrder = (opts) => buildAndPlaceOrder(cartItems, () => setCartItems([]), () => setIsCartOpen(false), opts, containerChargePerItem);
    // Complete & remove order from list
    const handleCompleteOrder = (orderId) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        showToast('✅ Order completed & removed');
    };
    // Send pending (second) bill via WhatsApp
    const handleSendPendingOrder = (order) => {
        sendOrderToWhatsApp(order);
        setPendingOrders(prev => prev.filter(o => o.id !== order.id));
        showToast('📩 Second bill sent via WhatsApp');
    };
    // Keywords mapping for robust category filtering
    const categoryKeywords = useMemo(() => {
        if (!selectedCategory)
            return [];
        const cat = selectedCategory.toLowerCase();
        if (cat === 'rolls')
            return ['roll', 'wrap', 'kathi', 'frankie'];
        if (cat === 'healthy')
            return ['healthy', 'salad', 'diet', 'bowl', 'sprout', 'detox', 'quinoa', 'idli', 'upma', 'chaas', 'buttermilk'];
        if (cat === 'chicken')
            return ['chicken', 'wing', 'wings', 'tikka', 'kebab'];
        if (cat === 'desserts')
            return ['dessert', 'cake', 'lava', 'phirni', 'ice cream', 'sundae', 'kesari', 'sweet', 'shake'];
        if (cat === 'ice cream')
            return ['ice cream', 'sundae', 'scoop', 'tub', 'shake', 'baskin'];
        if (cat === 'south indian')
            return ['south indian', 'dosa', 'idli', 'vada', 'utthapam', 'upma', 'sambar', 'rasam', 'filter coffee', 'vaango'];
        if (cat === 'pizza')
            return ['pizza', 'breadstick', 'italian', 'crust'];
        if (cat === 'biryani')
            return ['biryani', 'dum', 'handi', 'rice'];
        if (cat === 'burgers')
            return ['burger', 'zinger', 'crispy'];
        return [cat];
    }, [selectedCategory]);
    // Filtered stores for Home screen
    const filteredStores = useMemo(() => {
        return stores
            .filter((store) => {
            if (store.isVisible === false)
                return false;
            if (selectedCategory) {
                const matchesCat = categoryKeywords.some(kw => store.cuisines.some(c => c.toLowerCase().includes(kw)) ||
                    (store.tags && store.tags.some(t => t.toLowerCase().includes(kw))) ||
                    store.name.toLowerCase().includes(kw) ||
                    store.items.some(i => i.category.toLowerCase().includes(kw) ||
                        i.name.toLowerCase().includes(kw) ||
                        (i.description && i.description.toLowerCase().includes(kw))));
                if (!matchesCat)
                    return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = store.name.toLowerCase().includes(q);
                const matchCuisine = store.cuisines.some(c => c.toLowerCase().includes(q));
                const matchItem = store.items.some(i => i.name.toLowerCase().includes(q));
                if (!matchName && !matchCuisine && !matchItem)
                    return false;
            }
            return true;
        })
            .map((store, index) => ({
            store,
            index,
            isOpen: getOrderWindowStatus(store, currentTime).isOpen,
        }))
            .sort((first, second) => Number(second.isOpen) - Number(first.isOpen) || first.index - second.index)
            .map(({ store }) => store);
    }, [selectedCategory, categoryKeywords, searchQuery, stores, currentTime]);
    // Filtered dishes for currently selected category
    const categoryMatchedDishes = useMemo(() => {
        if (!selectedCategory)
            return [];
        const dishes = [];
        stores.filter(s => s.isVisible !== false).forEach((store) => {
            store.items.forEach((item) => {
                const isMatch = categoryKeywords.some(kw => item.category.toLowerCase().includes(kw) ||
                    item.name.toLowerCase().includes(kw) ||
                    (item.description && item.description.toLowerCase().includes(kw)) ||
                    store.cuisines.some(c => c.toLowerCase().includes(kw)));
                if (isMatch) {
                    dishes.push({ item, store });
                }
            });
        });
        return dishes;
    }, [selectedCategory, categoryKeywords, stores]);
    const totalCartCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
    const cartPrice = cartItems.reduce((acc, ci) => acc + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity, 0);
    // Compute customer's placed orders (matching my order IDs or current address phone)
    const customerOrders = useMemo(() => {
        let myIds = [];
        try {
            const s = localStorage.getItem('food_street_my_order_ids');
            myIds = s ? JSON.parse(s) : [];
        } catch (e) {}
        const phone = (currentAddress?.phone || '').replace(/\D/g, '');
        const myIdSet = new Set(myIds);

        return orders.filter(o => {
            if (!o || !o.id) return false;
            if (myIdSet.has(o.id)) return true;
            if (phone && phone.length >= 7) {
                const orderPhone = (o.contact || o.customerPhone || '').replace(/\D/g, '');
                if (orderPhone && (orderPhone.endsWith(phone) || phone.endsWith(orderPhone))) {
                    return true;
                }
            }
            return false;
        });
    }, [orders, currentAddress?.phone]);

    // Only count active orders belonging to this customer
    const activeOrdersCount = customerOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    // Handlers to synchronize Admin updates to local state and Supabase backend
    const handleUpdateStores = (newStores) => {
        setStores(newStores);
        saveStoresToDb(newStores);
    };
    const handleUpdateCategories = (newCategories) => {
        setCategories(newCategories);
        saveCategoriesToDb(newCategories);
    };
    const handleUpdateOrders = (newOrders) => {
        setOrders(newOrders);
    };
    if (isTummyTreat) {
        return _jsx(TummyTreatAdmin, {});
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex justify-center text-gray-900 font-sans", children: _jsxs("div", { className: "w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-white min-h-screen shadow-xl relative flex flex-col", children: [toastMessage && (_jsx("div", { className: "fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-200", children: _jsx("span", { children: toastMessage }) })), isAdmin ? (isAdminAuthenticated ? (_jsx("div", { className: "flex-1", children: _jsx(AdminTab, { stores: stores, categories: categories, orders: orders, onUpdateStores: handleUpdateStores, onUpdateCategories: handleUpdateCategories, onUpdateOrders: handleUpdateOrders, onLogout: () => {
                            clearAdminSession();
                            setIsAdminAuthenticated(false);
                            showToast('🔒 Logged out of Admin Panel');
                        } }) })) : (_jsx(AdminLogin, { onLoginSuccess: () => {
                        setIsAdminAuthenticated(true);
                        showToast('🔓 Welcome to Admin Portal');
                    }, onBackToStore: () => {
                        window.location.hash = '';
                        window.history.pushState(null, '', '/');
                        setCurrentPath('/');
                    } }))) : (_jsxs(_Fragment, { children: [activeTab === 'home' && (_jsxs("div", { className: "flex-1 pb-24", children: [_jsx(Header, { currentAddress: currentAddress, onOpenLocationModal: () => setIsLocationModalOpen(true), searchQuery: searchQuery, onSearchChange: setSearchQuery, onSearchFocus: () => { }, onAvatarClick: () => setActiveTab('profile'), onOpenCart: () => setIsCartOpen(true), cartCount: totalCartCount, cartTotal: cartPrice }), _jsx("div", { className: "mt-1", children: _jsx(CategoryBar, { categories: categories, selectedCategory: selectedCategory, onSelectCategory: handleSelectCategory }) }), selectedCategory && (_jsxs("div", { className: "px-4 mt-4 flex items-center justify-between", children: [_jsxs("h2", { className: "text-base font-extrabold text-gray-900 tracking-tight", children: [selectedCategory.toUpperCase(), " SPOTS"] }), _jsx("button", { onClick: () => setSelectedCategory(null), className: "text-xs font-bold text-red-600 hover:text-red-700 underline", children: "Clear filter" })] })), _jsxs("div", { className: "px-4 mt-3 space-y-4", children: [filteredStores.map((store) => (_jsx(StoreCard, { store: store, isFavorite: favorites.includes(store.id), onToggleFavorite: (e) => handleToggleFavorite(e, store.id), onClick: () => handleOpenStore(store) }, store.id))), filteredStores.length === 0 && (_jsxs("div", { className: "text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200", children: [_jsx("p", { className: "text-sm font-bold text-gray-500", children: "No restaurants match your search" }), _jsx("button", { onClick: () => {
                                                        setSelectedCategory(null);
                                                        setSearchQuery('');
                                                    }, className: "mt-2 text-xs font-bold text-red-600 hover:underline", children: "Reset all filters" })] }))] })] })), activeTab === 'search' && (_jsx("div", { className: "flex-1", children: _jsx(SearchTab, { stores: stores.filter(s => s.isVisible !== false), initialQuery: searchQuery, onSelectStore: handleOpenStore, onSelectMenuItem: (item, store) => {
                                     setCustomizingItemStore(store);
                                     setCustomizingItem(item);
                                 } }) })), activeTab === 'orders' && (_jsx("div", { className: "flex-1", children: _jsx(OrdersTab, { orders: customerOrders, stores: stores, pendingOrders: pendingOrders, onCompleteOrder: handleCompleteOrder, onExploreFood: () => setActiveTab('home'), onSendPendingOrder: handleSendPendingOrder }) })), activeTab === 'profile' && (_jsx("div", { className: "flex-1", children: _jsx(ProfileTab, { currentAddress: currentAddress, addresses: addresses, onOpenLocationModal: () => setIsLocationModalOpen(true), favoritesCount: favorites.length, onViewFavorites: () => setActiveTab('home') }) })), cartItems.length > 0 && activeTab !== 'orders' && !isStoreModalOpen && (_jsx("div", { className: "fixed inset-x-0 bottom-18 z-30 flex justify-center px-4 animate-in slide-in-from-bottom duration-200", children: _jsx("div", { className: "w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col gap-2", children: _jsxs("button", { id: "floating-cart-btn", onClick: () => setIsCartOpen(true), className: "w-full min-h-[48px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-xl active:scale-98 transition-all", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0 leading-none", children: [_jsxs("span", { className: "inline-flex items-center justify-center h-6 px-2 bg-white/20 text-white text-[10px] font-black rounded-lg shrink-0", children: [totalCartCount, " ", totalCartCount === 1 ? 'ITEM' : 'ITEMS'] }), _jsxs("span", { className: "text-sm font-extrabold text-white leading-none", children: ["\u20B9", cartPrice.toFixed(0)] })] }), _jsx("span", { className: "text-xs font-black uppercase tracking-wider whitespace-nowrap", children: "View Cart \u2192" })] }) }) })), _jsx(BottomNav, { activeTab: activeTab, onTabChange: (tab) => {
                                setActiveTab(tab);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, activeOrdersCount: activeOrdersCount, cartItemsCount: totalCartCount, onOpenCart: () => setIsCartOpen(true), showAdmin: false }), _jsx(StoreDetailModal, { store: selectedStore, isOpen: isStoreModalOpen, onClose: () => setIsStoreModalOpen(false), isFavorite: selectedStore ? favorites.includes(selectedStore.id) : false, onToggleFavorite: (storeId) => handleToggleFavorite(undefined, storeId), cartItems: cartItems, onOpenItemModal: (item) => {
                                setCustomizingItemStore(selectedStore);
                                setCustomizingItem(item);
                            }, onUpdateCartQuantity: handleUpdateCartQuantity, onOpenCart: () => setIsCartOpen(true) }), _jsx(MenuItemModal, { item: customizingItem, onClose: () => {
                                setCustomizingItem(null);
                                setCustomizingItemStore(null);
                            }, onAddToCart: handleAddToCart }), _jsx(CartDrawer, { isOpen: isCartOpen, onClose: () => setIsCartOpen(false), cartItems: cartItems, currentAddress: currentAddress, onOpenLocationModal: () => setIsLocationModalOpen(true), onUpdateQuantity: handleUpdateCartQuantity, onClearCart: () => setCartItems([]), containerChargePerItem: containerChargePerItem, onPlaceOrder: handlePlaceOrder }), _jsx(LocationModal, { isOpen: isLocationModalOpen, onClose: () => setIsLocationModalOpen(false), addresses: addresses, currentAddress: currentAddress, onSelectAddress: (addr) => setCurrentAddress(addr), onAddAddress: (newAddr) => setAddresses((prev) => [newAddr, ...prev]), onDeleteAddress: (addressId) => {
                                const remaining = addresses.filter(a => a.id !== addressId);
                                if (remaining.length === 0)
                                    return;
                                setAddresses(remaining);
                                if (currentAddress.id === addressId) {
                                    setCurrentAddress(remaining[0]);
                                }
                                showToast('Address removed');
                            } })] }))] }) }));
}
