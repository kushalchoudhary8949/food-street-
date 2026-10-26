/**
 * ============================================================================
 * FOODZA BACK-OFFICE OPERATIONS DASHBOARD (`AdminTab.js`)
 * ============================================================================
 * 
 * ROLE IN CODEBASE:
 * Serves as the central administration and management portal for FoodZa.
 * It provides full CRUD operations, live order tracking, business controls,
 * and database maintenance capabilities.
 * 
 * SUB-TABS BREAKDOWN:
 * 1. Overview (`overview`):
 *    - High-level KPIs: Total Revenue, Active Orders, Total Stores (with Live count), Menu Items.
 *    - Instant Store Operating Controls: Quick Open, Close, or Auto (Schedule) toggle for each store.
 *    - Quick Live/Hidden website visibility toggle.
 *    - Real-time recent live orders preview.
 * 2. Stores Manager (`stores`):
 *    - Full Store List with Search and Visibility Filters (`All`, `Visible`, `Hidden`).
 *    - Website Visibility Control Bar (`Live` vs `Hidden`) with instant toggle.
 *    - Operating Hours: Configure Opening & Closing 24h times with 12h preview.
 *    - Add New Store / Edit Store modal form with image URL, fees, and cuisines.
 * 3. Discounts Manager (`discounts`):
 *    - Store Discount KPIs: Active count, average discount amount.
 *    - Search and Filter stores by discount status.
 *    - Inline discount configuration: discount amount (₹), minimum order value (₹),
 *      and customer-facing discount badge preview.
 * 4. Menu Items Manager (`items`):
 *    - Store selector dropdown.
 *    - Add, edit, or remove menu items with prices, categories, veg/non-veg flags, and bestseller tags.
 * 5. Categories Manager (`categories`):
 *    - Manage home screen category carousel items (name, slug, image).
 * 6. Live Orders Tracker (`orders`):
 *    - Live order fulfillment pipeline with status stepper:
 *      `placed` -> `preparing` -> `out_for_delivery` -> `delivered` / `cancelled`.
 *    - Search orders by ID, customer name, room number, hostel, or phone.
 *    - Display formatted Grand Total, item breakdown, and delivery details.
 * 7. Cloud & Database (`cloud`):
 *    - Supabase PostgreSQL connection diagnostics & table row count statistics.
 *    - Database Seeding tool to populate or reset mock stores and categories.
 * 
 * PROPS:
 * @param {Array} stores - Array of all store objects.
 * @param {Array} categories - Array of category taxonomy items.
 * @param {Array} orders - Array of all normalized orders.
 * @param {Function} onUpdateStores - Callback to update stores in App.js state.
 * @param {Function} onUpdateCategories - Callback to update categories in App.js state.
 * @param {Function} onUpdateOrders - Callback to update orders in App.js state.
 * @param {Function} onLogout - Callback to end admin session and return to storefront.
 * ============================================================================
 */

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Building2, Utensils, ShoppingBag, Plus, Trash2, Edit3, XCircle, ChevronRight, DollarSign, LogOut, Database, RefreshCw, Check, Sparkles, Phone, MapPin, CreditCard, MessageSquare, Power, Store, Clock, Tag, Percent, BadgePercent, Search, User, Home, Building, Eye, EyeOff } from 'lucide-react';
import { saveStoresToDb, saveCategoriesToDb, deleteStoreFromDb, deleteCategoryFromDb, deleteOrderFromDb, updateOrderStatusInDb, seedDatabase, fetchDatabaseStatus, fetchOrdersFromDb, fetchStoresFromDb, fetchCategoriesFromDb, saveOrderToDb, subscribeToOrders } from '../services/api';
import { STORES, CATEGORIES } from '../data/mockData';
import { getOrderWindowStatus, getStoreManualOverride, getStoreTimings, formatTimeTo12Hour, setStoreStatusCache } from '../utils/orderTiming';
import { getStoreDiscount, formatDiscountLabel } from '../utils/discount';

export const AdminTab = ({ stores, categories, orders, onUpdateStores, onUpdateCategories, onUpdateOrders, onLogout, }) => {
    const [activeSubTab, setActiveSubTab] = useState('overview');
    // Edit / Add Form States
    const [editingStore, setEditingStore] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [storeForm, setStoreForm] = useState({
        name: '',
        deliveryTime: '25-35 mins',
        deliveryFee: 20,
        distance: '2.5 km',
        image: '',
        cuisines: '',
        tags: '',
        openTime: '11:00',
        closeTime: '23:00',
        isOpen: undefined,
        isVisible: true,
        discountActive: false,
        discountAmount: '',
        minOrderValue: '',
    });
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeVisibilityFilter, setStoreVisibilityFilter] = useState('all'); // 'all' | 'visible' | 'hidden'
    // Discounts Management State
    const [editingDiscountStoreId, setEditingDiscountStoreId] = useState(null);
    const [discountForm, setDiscountForm] = useState({
        discountActive: true,
        discountAmount: 40,
        minOrderValue: 150,
    });
    const [discountSearchQuery, setDiscountSearchQuery] = useState('');
    const [discountFilter, setDiscountFilter] = useState('all');
    const [discountToast, setDiscountToast] = useState(null);
    const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
    const [editingItem, setEditingItem] = useState(null);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [itemForm, setItemForm] = useState({
        name: '',
        price: 199,
        description: '',
        image: '',
        category: '',
        isVeg: true,
        isBestseller: false,
    });
    const [editingCategory, setEditingCategory] = useState(null);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        image: '',
        slug: '',
    });
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [isFetchingDb, setIsFetchingDb] = useState(false);
    const [isCheckingDb, setIsCheckingDb] = useState(false);
    const [dbStatus, setDbStatus] = useState(null);
    const [cloudStatusMsg, setCloudStatusMsg] = useState(null);
    const [orderFilter, setOrderFilter] = useState('all');
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const checkDb = async () => {
        setIsCheckingDb(true);
        try {
            const status = await fetchDatabaseStatus();
            setDbStatus(status);
        }
        catch (e) {
            setDbStatus({
                success: false,
                connected: false,
                database: 'Supabase (PostgreSQL)',
                error: e?.message || 'Failed to check database',
            });
        }
        finally {
            setIsCheckingDb(false);
        }
    };
    React.useEffect(() => {
        if (activeSubTab === 'cloud') {
            checkDb();
        }
    }, [activeSubTab]);
    const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
    const refreshOrders = async () => {
        setIsRefreshingOrders(true);
        try {
            const dbOrders = await fetchOrdersFromDb({ limit: 50 });
            if (Array.isArray(dbOrders)) {
                onUpdateOrders(dbOrders);
            }
        } catch (e) {
            console.warn('Orders refresh notice:', e);
        } finally {
            setIsRefreshingOrders(false);
        }
    };
    const formatOrderDate = (order) => {
        if (order?.created_at) {
            try {
                const d = new Date(order.created_at);
                if (!isNaN(d.getTime())) {
                    const now = new Date();
                    const isToday = d.toDateString() === now.toDateString();
                    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                    if (isToday) return `Today, ${timeStr}`;
                    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return `${dateStr}, ${timeStr}`;
                }
            } catch (e) {}
        }
        return order?.placedAt || 'Recently';
    };
    // Live orders sync across all admin panel tabs using Supabase Realtime (WebSockets)
    React.useEffect(() => {
        const unsubscribe = subscribeToOrders((dbOrders) => {
            if (Array.isArray(dbOrders)) {
                onUpdateOrders(dbOrders);
            }
        }, { limit: 50, fallbackIntervalMs: 45000 });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [onUpdateOrders]);
    const handleFetchFromPostgres = async () => {
        setIsFetchingDb(true);
        setCloudStatusMsg(null);
        try {
            const [pgStores, pgCats, pgOrders] = await Promise.all([
                fetchStoresFromDb(),
                fetchCategoriesFromDb(),
                fetchOrdersFromDb(),
            ]);
            let msgParts = [];
            if (pgStores && pgStores.length > 0) {
                const storeMap = new Map();
                pgStores.forEach(s => storeMap.set(s.id, s));
                // Preserve any store present locally that isn't in remote yet
                (stores || []).forEach(s => {
                    if (!storeMap.has(s.id)) {
                        storeMap.set(s.id, s);
                    }
                });
                const mergedStores = Array.from(storeMap.values());
                onUpdateStores(mergedStores);
                await saveStoresToDb(mergedStores);
                msgParts.push(`${mergedStores.length} stores`);
            }
            if (pgCats && pgCats.length > 0) {
                onUpdateCategories(pgCats);
                msgParts.push(`${pgCats.length} categories`);
            }
            if (pgOrders && pgOrders.length > 0) {
                onUpdateOrders(pgOrders);
                msgParts.push(`${pgOrders.length} orders`);
            }
            await checkDb();
            if (msgParts.length > 0) {
                setCloudStatusMsg(`✅ Fetched and loaded ${msgParts.join(', ')} from Supabase successfully!`);
            }
            else {
                setCloudStatusMsg(`ℹ️ Database connected, but tables are currently empty. Click "Push & Seed Data" to populate.`);
            }
        }
        catch (err) {
            setCloudStatusMsg(`⚠️ Failed to fetch from Supabase: ${err?.message || 'Network error'}`);
        }
        finally {
            setIsFetchingDb(false);
        }
    };
    // Calculate Overview Stats
    const totalRevenue = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.grandTotal, 0);
    const activeOrdersCount = orders.filter(o => o.status !== 'delivered').length;
    const totalItemsCount = stores.reduce((sum, s) => sum + (s.items?.length || 0), 0);

    // Store Visibility Stats & Filters
    const visibleStoresCount = stores.filter(s => s.isVisible !== false).length;
    const hiddenStoresCount = stores.length - visibleStoresCount;

    const filteredAdminStores = stores.filter(s => {
        if (storeVisibilityFilter === 'visible' && s.isVisible === false) return false;
        if (storeVisibilityFilter === 'hidden' && s.isVisible !== false) return false;
        if (storeSearchQuery.trim()) {
            const q = storeSearchQuery.toLowerCase().trim();
            const matchName = s.name?.toLowerCase().includes(q);
            const matchCuisines = s.cuisines?.some(c => c.toLowerCase().includes(q));
            return matchName || matchCuisines;
        }
        return true;
    });

    // Discount Calculation & Handlers
    const storesWithDiscount = stores.filter(s => {
        const d = getStoreDiscount(s);
        return Boolean(d && d.amount > 0);
    });
    const averageDiscountAmount = storesWithDiscount.length > 0
        ? Math.round(storesWithDiscount.reduce((sum, s) => sum + (getStoreDiscount(s)?.amount || 0), 0) / storesWithDiscount.length)
        : 0;

    const filteredDiscountStores = stores.filter(s => {
        const d = getStoreDiscount(s);
        const hasDisc = Boolean(d && d.amount > 0);
        if (discountFilter === 'active' && !hasDisc) return false;
        if (discountFilter === 'inactive' && hasDisc) return false;
        if (discountSearchQuery.trim()) {
            const q = discountSearchQuery.toLowerCase().trim();
            const matchName = s.name?.toLowerCase().includes(q);
            const matchCuisines = s.cuisines?.some(c => c.toLowerCase().includes(q));
            return matchName || matchCuisines;
        }
        return true;
    });

    const showDiscountToast = (msg) => {
        setDiscountToast(msg);
        setTimeout(() => setDiscountToast(null), 3500);
    };

    const handleToggleStoreDiscount = async (storeId, shouldEnable) => {
        const targetStore = stores.find(s => s.id === storeId);
        if (!targetStore) return;
        const currentDiscount = getStoreDiscount(targetStore);
        const amount = Number(targetStore.discountAmount || currentDiscount?.amount || 40);
        const minOrder = Number(targetStore.minOrderValue || currentDiscount?.minOrder || 150);
        const updatedStores = stores.map(s => {
            if (s.id === storeId) {
                return {
                    ...s,
                    discountActive: shouldEnable,
                    discountAmount: shouldEnable ? amount : 0,
                    minOrderValue: shouldEnable ? minOrder : 0,
                    discountOffer: shouldEnable
                        ? (minOrder > 0 ? `₹${amount} OFF on orders above ₹${minOrder}` : `Flat ₹${amount} OFF`)
                        : '',
                };
            }
            return s;
        });
        onUpdateStores(updatedStores);
        await saveStoresToDb(updatedStores);
        showDiscountToast(shouldEnable ? `🏷️ Discount enabled for ${targetStore.name}` : `❌ Discount removed from ${targetStore.name}`);
    };

    const handleSaveStoreDiscount = async (storeId, { discountActive, discountAmount, minOrderValue }) => {
        const targetStore = stores.find(s => s.id === storeId);
        if (!targetStore) return;
        const amount = Math.max(0, Number(discountAmount || 0));
        const minOrder = Math.max(0, Number(minOrderValue || 0));
        const isActive = Boolean(discountActive && amount > 0);
        const offerText = isActive
            ? (minOrder > 0 ? `₹${amount} OFF on orders above ₹${minOrder}` : `Flat ₹${amount} OFF`)
            : '';
        const updatedStores = stores.map(s => {
            if (s.id === storeId) {
                return {
                    ...s,
                    discountActive: isActive,
                    discountAmount: amount,
                    minOrderValue: minOrder,
                    discountOffer: offerText,
                };
            }
            return s;
        });
        onUpdateStores(updatedStores);
        await saveStoresToDb(updatedStores);
        setEditingDiscountStoreId(null);
        showDiscountToast(`✅ Discount settings saved for ${targetStore.name}`);
    };

    const handleRemoveStoreDiscount = async (storeId) => {
        const targetStore = stores.find(s => s.id === storeId);
        if (!targetStore) return;
        const updatedStores = stores.map(s => {
            if (s.id === storeId) {
                return {
                    ...s,
                    discountActive: false,
                    discountAmount: 0,
                    minOrderValue: 0,
                    discountOffer: '',
                };
            }
            return s;
        });
        onUpdateStores(updatedStores);
        await saveStoresToDb(updatedStores);
        if (editingDiscountStoreId === storeId) {
            setEditingDiscountStoreId(null);
        }
        showDiscountToast(`🗑️ Discount removed completely from ${targetStore.name}`);
    };

    // Store Open / Close Status Handler
    const handleToggleStoreStatus = async (storeId, newStatus) => {
        try {
            if (newStatus === 'auto') {
                localStorage.removeItem(`store_status_${storeId}`);
            } else {
                localStorage.setItem(`store_status_${storeId}`, newStatus);
            }
        } catch (e) {}
        const updatedStores = stores.map(s => {
            if (s.id === storeId) {
                return {
                    ...s,
                    isOpen: newStatus === 'auto' ? undefined : (newStatus === 'open'),
                };
            }
            return s;
        });
        onUpdateStores(updatedStores);
        await saveStoresToDb(updatedStores);
    };

    // Store Website Visibility Handler
    const handleToggleStoreVisibility = async (storeId) => {
        const targetStore = stores.find(s => s.id === storeId);
        if (!targetStore) return;
        const newVisible = targetStore.isVisible === false ? true : false;
        const updatedStores = stores.map(s => {
            if (s.id === storeId) {
                return {
                    ...s,
                    isVisible: newVisible,
                };
            }
            return s;
        });
        setStoreStatusCache(updatedStores);
        onUpdateStores(updatedStores);
        await saveStoresToDb(updatedStores);
        showDiscountToast(newVisible 
            ? `👁️ "${targetStore.name}" is now VISIBLE on website` 
            : `🙈 "${targetStore.name}" is now HIDDEN from website`);
    };

    // Store Handlers
    const handleSaveStore = async (e) => {
        e.preventDefault();
        const cuisinesList = storeForm.cuisines.split(',').map(c => c.trim()).filter(Boolean);
        const tagsList = storeForm.tags.split(',').map(t => t.trim()).filter(Boolean);
        const hasDiscount = Boolean(storeForm.discountActive);
        const dAmount = Math.max(0, Number(storeForm.discountAmount || 0));
        const dMinOrder = Math.max(0, Number(storeForm.minOrderValue || 0));
        const discountOffer = hasDiscount && dAmount > 0
            ? (dMinOrder > 0 ? `₹${dAmount} OFF on orders above ₹${dMinOrder}` : `Flat ₹${dAmount} OFF`)
            : '';
        let updatedList = [];
        if (isAddingStore) {
            const newStore = {
                id: `store-${Date.now()}`,
                name: storeForm.name,
                rating: 4.5,
                reviewsCount: 1,
                deliveryTime: storeForm.deliveryTime,
                deliveryFee: Number(storeForm.deliveryFee),
                distance: storeForm.distance,
                image: storeForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
                cuisines: cuisinesList.length ? cuisinesList : ['Pizzas', 'Burgers'],
                discountOffer: discountOffer || 'Flat 20% OFF',
                discountActive: hasDiscount && dAmount > 0,
                discountAmount: dAmount,
                minOrderValue: dMinOrder,
                tags: tagsList,
                menuCategories: ['All'],
                items: [],
                openTime: storeForm.openTime || '11:00',
                closeTime: storeForm.closeTime || '23:00',
                isOpen: storeForm.isOpen,
                isVisible: storeForm.isVisible !== false,
            };
            updatedList = [...stores, newStore];
            setStoreStatusCache(updatedList);
            onUpdateStores(updatedList);
            setIsAddingStore(false);
            await saveStoresToDb(updatedList);
        }
        else if (editingStore) {
            updatedList = stores.map(s => {
                if (s.id === editingStore.id) {
                    return {
                        ...s,
                        name: storeForm.name,
                        deliveryTime: storeForm.deliveryTime,
                        deliveryFee: Number(storeForm.deliveryFee),
                        distance: storeForm.distance,
                        image: storeForm.image || s.image,
                        cuisines: cuisinesList.length ? cuisinesList : s.cuisines,
                        tags: tagsList.length ? tagsList : s.tags,
                        openTime: storeForm.openTime || s.openTime || '11:00',
                        closeTime: storeForm.closeTime || s.closeTime || '23:00',
                        isOpen: storeForm.isOpen,
                        isVisible: storeForm.isVisible !== false,
                        discountActive: hasDiscount && dAmount > 0,
                        discountAmount: dAmount,
                        minOrderValue: dMinOrder,
                        discountOffer: discountOffer,
                    };
                }
                return s;
            });
            setStoreStatusCache(updatedList);
            onUpdateStores(updatedList);
            setEditingStore(null);
            await saveStoresToDb(updatedList);
        }
        setStoreForm({
            name: '',
            deliveryTime: '25-35 mins',
            deliveryFee: 20,
            distance: '2.5 km',
            image: '',
            cuisines: '',
            tags: '',
            openTime: '11:00',
            closeTime: '23:00',
            isOpen: undefined,
            isVisible: true,
            discountActive: false,
            discountAmount: '',
            minOrderValue: '',
        });
    };
    const startEditStore = (store) => {
        setEditingStore(store);
        setIsAddingStore(false);
        const timings = getStoreTimings(store);
        const currentDiscount = getStoreDiscount(store);
        const hasDisc = store.discountActive !== undefined ? Boolean(store.discountActive) : Boolean(currentDiscount && currentDiscount.amount > 0);
        const discAmount = store.discountAmount !== undefined ? store.discountAmount : (currentDiscount?.amount || '');
        const discMinOrder = store.minOrderValue !== undefined ? store.minOrderValue : (currentDiscount?.minOrder || '');
        setStoreForm({
            name: store.name,
            deliveryTime: store.deliveryTime,
            deliveryFee: store.deliveryFee,
            distance: store.distance || '2.5 km',
            image: store.image,
            cuisines: store.cuisines.join(', '),
            tags: store.tags?.join(', ') || '',
            openTime: store.openTime || timings.openTime || '11:00',
            closeTime: store.closeTime || timings.closeTime || '23:00',
            isOpen: store.isOpen,
            isVisible: store.isVisible !== false,
            discountActive: hasDisc,
            discountAmount: discAmount,
            minOrderValue: discMinOrder,
        });
    };
    const handleDeleteStore = async (storeId) => {
        if (confirm('Are you sure you want to delete this store and all its items?')) {
            onUpdateStores(stores.filter(s => s.id !== storeId));
            await deleteStoreFromDb(storeId);
        }
    };
    // Item Handlers
    const handleSaveItem = (e) => {
        e.preventDefault();
        const currentStore = stores.find(s => s.id === selectedStoreId);
        if (!currentStore)
            return;
        if (isAddingItem) {
            const newItem = {
                id: `item-${Date.now()}`,
                storeId: selectedStoreId,
                name: itemForm.name,
                price: Number(itemForm.price),
                description: itemForm.description,
                image: itemForm.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
                isVeg: itemForm.isVeg,
                isBestseller: itemForm.isBestseller,
                category: itemForm.category || 'Veg',
            };
            const updatedStores = stores.map(s => {
                if (s.id === selectedStoreId) {
                    const updatedItems = [...(s.items || []), newItem];
                    const updatedCategories = s.menuCategories.includes(newItem.category)
                        ? s.menuCategories
                        : [...s.menuCategories, newItem.category];
                    return { ...s, items: updatedItems, menuCategories: updatedCategories };
                }
                return s;
            });
            onUpdateStores(updatedStores);
            setIsAddingItem(false);
        }
        else if (editingItem) {
            const updatedStores = stores.map(s => {
                if (s.id === selectedStoreId) {
                    const updatedItems = s.items.map(item => {
                        if (item.id === editingItem.id) {
                            return {
                                ...item,
                                name: itemForm.name,
                                price: Number(itemForm.price),
                                description: itemForm.description,
                                image: itemForm.image || item.image,
                                isVeg: itemForm.isVeg,
                                isBestseller: itemForm.isBestseller,
                                category: itemForm.category || item.category,
                            };
                        }
                        return item;
                    });
                    return { ...s, items: updatedItems };
                }
                return s;
            });
            onUpdateStores(updatedStores);
            setEditingItem(null);
        }
        setItemForm({
            name: '',
            price: 199,
            description: '',
            image: '',
            category: '',
            isVeg: true,
            isBestseller: false,
        });
    };
    const startEditItem = (item) => {
        setEditingItem(item);
        setIsAddingItem(false);
        setItemForm({
            name: item.name,
            price: item.price,
            description: item.description,
            image: item.image,
            category: item.category,
            isVeg: item.isVeg,
            isBestseller: !!item.isBestseller,
        });
    };
    const handleDeleteItem = (itemId) => {
        if (confirm('Delete this menu item?')) {
            const updatedStores = stores.map(s => {
                if (s.id === selectedStoreId) {
                    return { ...s, items: s.items.filter(i => i.id !== itemId) };
                }
                return s;
            });
            onUpdateStores(updatedStores);
        }
    };
    // Category Handlers
    const handleSaveCategory = (e) => {
        e.preventDefault();
        if (isAddingCategory) {
            const newCat = {
                id: `cat-${Date.now()}`,
                name: categoryForm.name,
                slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
                image: categoryForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
            };
            onUpdateCategories([...categories, newCat]);
            setIsAddingCategory(false);
        }
        else if (editingCategory) {
            const updatedCats = categories.map(c => {
                if (c.id === editingCategory.id) {
                    return {
                        ...c,
                        name: categoryForm.name,
                        slug: categoryForm.slug || c.slug,
                        image: categoryForm.image || c.image,
                    };
                }
                return c;
            });
            onUpdateCategories(updatedCats);
            setEditingCategory(null);
        }
        setCategoryForm({
            name: '',
            image: '',
            slug: '',
        });
    };
    const startEditCategory = (cat) => {
        setEditingCategory(cat);
        setIsAddingCategory(false);
        setCategoryForm({
            name: cat.name,
            image: cat.image,
            slug: cat.slug,
        });
    };
    const handleDeleteCategory = async (catId) => {
        if (confirm('Delete this category?')) {
            onUpdateCategories(categories.filter(c => c.id !== catId));
            await deleteCategoryFromDb(catId);
        }
    };
    // Order Status Handler
    const handleAdvanceStatus = async (orderId, currentStatus) => {
        const statusMap = {
            'placed': 'confirmed',
            'confirmed': 'cooking',
            'cooking': 'out_for_delivery',
            'out_for_delivery': 'delivered',
            'delivered': 'delivered',
        };
        const nextStatus = statusMap[currentStatus];
        const updatedOrders = orders.map(o => {
            if (o.id === orderId) {
                return { ...o, status: nextStatus };
            }
            return o;
        });
        onUpdateOrders(updatedOrders);
        await updateOrderStatusInDb(orderId, nextStatus);
    };
    const handleCancelOrder = async (orderId) => {
        if (confirm('Are you sure you want to cancel this order?')) {
            onUpdateOrders(orders.filter(o => o.id !== orderId));
            await deleteOrderFromDb(orderId);
        }
    };
    return (_jsxs("div", { className: "bg-[#F8F9FA] min-h-screen pb-24 text-gray-800", children: [_jsxs("div", { className: "bg-linear-to-r from-red-600 to-rose-500 text-white px-4 py-5 shadow-md flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-xl font-black flex items-center space-x-2", children: [_jsx(Building2, { className: "w-6 h-6" }), _jsx("span", { children: "FoodZa Admin Panel" })] }), _jsx("p", { className: "text-xs text-rose-100 mt-0.5", children: "Manage your stores, menus, categories, and tracking" })] }), onLogout && (_jsxs("button", { onClick: onLogout, className: "flex items-center space-x-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-xl text-xs font-bold text-white transition-colors border border-white/20 cursor-pointer shadow-xs", title: "Log out of Admin Panel", children: [_jsx(LogOut, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Log Out" })] }))] }), _jsx("div", { className: "flex border-b border-gray-200 bg-white overflow-x-auto no-scrollbar shadow-xs", children: ['overview', 'stores', 'discounts', 'items', 'categories', 'orders', 'cloud'].map(tab => (_jsx("button", { onClick: () => setActiveSubTab(tab), className: `flex-1 py-3 px-3.5 text-center font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${activeSubTab === tab
                        ? 'border-red-600 text-red-600 bg-red-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`, children: tab === 'cloud' ? '⚡ Supabase' : tab === 'discounts' ? `🏷️ Discounts (${storesWithDiscount.length})` : tab }, tab))) }), _jsxs("div", { className: "p-4 max-w-lg mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-5", children: [discountToast && (_jsxs("div", { className: "p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-between transition-all", children: [_jsx("span", { children: discountToast }), _jsx("button", { onClick: () => setDiscountToast(null), className: "text-white/80 hover:text-white font-black ml-2 cursor-pointer text-sm", children: "✕" })] })), activeSubTab === 'overview' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3", children: [_jsx("div", { className: "p-3 bg-rose-50 text-rose-600 rounded-xl", children: _jsx(DollarSign, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase font-black tracking-wider text-gray-400", children: "Total Sales" }), _jsxs("div", { className: "text-lg font-black text-gray-900", children: ["\u20B9", totalRevenue.toFixed(0)] })] })] }), _jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3", children: [_jsx("div", { className: "p-3 bg-red-50 text-red-600 rounded-xl", children: _jsx(ShoppingBag, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase font-black tracking-wider text-gray-400", children: "Active Orders" }), _jsx("div", { className: "text-lg font-black text-gray-900", children: activeOrdersCount })] })] }), _jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3", children: [_jsx("div", { className: "p-3 bg-emerald-50 text-emerald-600 rounded-xl", children: _jsx(Building2, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase font-black tracking-wider text-gray-400", children: "Total Stores" }), _jsxs("div", { className: "text-lg font-black text-gray-900", children: [stores.length, _jsxs("span", { className: "text-[11px] font-bold text-emerald-600 ml-1.5", children: ["(", visibleStoresCount, " Live)"] })] })] })] }), _jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3", children: [_jsx("div", { className: "p-3 bg-amber-50 text-amber-600 rounded-xl", children: _jsx(Utensils, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase font-black tracking-wider text-gray-400", children: "Menu Items" }), _jsx("div", { className: "text-lg font-black text-gray-900", children: totalItemsCount })] })] })] }),             _jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3", children: [
                _jsxs("div", { className: "flex items-center justify-between", children: [
                    _jsxs("div", { children: [
                        _jsxs("h3", { className: "font-extrabold text-sm text-gray-900 flex items-center gap-1.5", children: [_jsx(Store, { className: "w-4 h-4 text-red-600" }), _jsx("span", { children: "Store Open / Close Controls" })] }),
                        _jsx("p", { className: "text-xs text-gray-400 mt-0.5", children: "Instantly open or close any store for customer orders" })
                    ] }),
                    _jsx("button", { onClick: () => setActiveSubTab('stores'), className: "text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer", children: "Manage All →" })
                ] }),
                _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1", children: stores.map(store => {
                    const status = getOrderWindowStatus(store.id, undefined, store);
                    const manualSetting = store.isOpen !== undefined ? (store.isOpen ? 'open' : 'closed') : (getStoreManualOverride(store.id) || 'auto');
                    const isAuto = manualSetting === 'auto';
                    return (
                        _jsxs("div", { className: "p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-2", children: [
                            _jsxs("div", { className: "min-w-0 flex items-center space-x-2", children: [
                                _jsx("span", { className: `w-2.5 h-2.5 rounded-full shrink-0 ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}` }),
                                _jsxs("div", { className: "min-w-0", children: [
                                    _jsxs("div", { className: "font-bold text-xs text-gray-900 truncate flex items-center gap-1.5", children: [
                                        _jsx("span", { className: "truncate", children: store.name }),
                                        store.isVisible === false && _jsx("span", { className: "text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 rounded font-black shrink-0", children: "HIDDEN" })
                                    ] }),
                                    _jsxs("div", { className: "text-[10px] text-gray-500 font-medium truncate flex items-center gap-1.5", children: [
                                        _jsx("span", { children: status.isOpen ? '🟢 Open' : '🔴 Closed' }),
                                        _jsx("span", { className: "text-gray-300", children: "•" }),
                                        _jsx("span", { children: status.timingLabel })
                                    ] })
                                ] })
                            ] }),
                            _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
                                _jsxs("button", {
                                    type: "button",
                                    onClick: () => handleToggleStoreVisibility(store.id),
                                    className: `p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                                        store.isVisible !== false
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`,
                                    title: store.isVisible !== false ? "Visible on website (Click to hide)" : "Hidden from website (Click to make visible)",
                                    children: [
                                        store.isVisible !== false ? _jsx(Eye, { className: "w-3.5 h-3.5" }) : _jsx(EyeOff, { className: "w-3.5 h-3.5" }),
                                        _jsx("span", { className: "text-[10px] hidden sm:inline", children: store.isVisible !== false ? 'Live' : 'Hidden' })
                                    ]
                                }),
                                _jsxs("div", { className: "flex items-center bg-gray-200/80 p-0.5 rounded-lg text-[10px] font-bold shrink-0", children: [
                                    _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'open'), className: `px-2 py-0.5 rounded-md transition-all cursor-pointer ${manualSetting === 'open' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'}`, title: "Force Open", children: "Open" }),
                                    _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'closed'), className: `px-2 py-0.5 rounded-md transition-all cursor-pointer ${manualSetting === 'closed' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-rose-700'}`, title: "Force Close", children: "Close" }),
                                    _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'auto'), className: `px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${isAuto ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-700'}`, title: "Follow Schedule", children: "Auto" })
                                ] })
                            ] })
                        ] }, store.id)
                    );
                }) })
            ] }),
            _jsxs("div", { className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3", children: [_jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Recent Live Orders" }), orders.length === 0 ? (_jsx("div", { className: "text-center py-6 text-xs text-gray-400", children: "No recent orders placed" })) : (_jsx("div", { className: "divide-y divide-gray-100", children: orders.slice(0, 5).map(order => (_jsxs("div", { className: "py-2.5 flex items-center justify-between text-xs", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-bold text-gray-900", children: [order.store?.name || 'Food Order', " (", order.orderNumber || order.id, ")"] }), _jsxs("div", { className: "text-gray-500 mt-0.5", children: ["\u20B9", (order.grandTotal ?? 0).toFixed(0), " \u2022 ", order.items?.length || 0, " items"] })] }), _jsx("span", { className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${order.status === 'delivered'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : order.status === 'out_for_delivery'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-amber-50 text-amber-700 animate-pulse'}`, children: (order.status || 'placed').replace('_', ' ') })] }, order.id))) }))] })] })), activeSubTab === 'stores' && (_jsxs("div", { className: "space-y-4", children: [
    _jsxs("div", { className: "flex justify-between items-center", children: [
        _jsxs("div", { children: [
            _jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Manage Stores" }),
            _jsxs("p", { className: "text-xs text-gray-500 mt-0.5", children: [
                stores.length, " stores (", visibleStoresCount, " visible on website, ", hiddenStoresCount, " hidden)"
            ] })
        ] }),
        _jsxs("button", { onClick: () => {
            setIsAddingStore(true);
            setEditingStore(null);
            setStoreForm({
                name: '',
                deliveryTime: '25-35 mins',
                deliveryFee: 20,
                distance: '2.5 km',
                image: '',
                cuisines: '',
                tags: '',
                openTime: '11:00',
                closeTime: '23:00',
                isOpen: undefined,
                isVisible: true,
                discountActive: false,
                discountAmount: '',
                minOrderValue: '',
            });
        }, className: "flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Add Store" })] })
    ] }),
    _jsxs("div", { className: "flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between", children: [
        _jsxs("div", { className: "relative flex-1", children: [
            _jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-2.5" }),
            _jsx("input", { type: "text", value: storeSearchQuery, onChange: e => setStoreSearchQuery(e.target.value), placeholder: "Search store by name or cuisine...", className: "w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 shadow-xs" })
        ] }),
        _jsxs("div", { className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar", children: [
            _jsx("button", { type: "button", onClick: () => setStoreVisibilityFilter('all'), className: `px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${storeVisibilityFilter === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`, children: `All (${stores.length})` }),
            _jsxs("button", { type: "button", onClick: () => setStoreVisibilityFilter('visible'), className: `px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${storeVisibilityFilter === 'visible' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'}`, children: [_jsx(Eye, { className: "w-3 h-3" }), `Visible (${visibleStoresCount})`] }),
            _jsxs("button", { type: "button", onClick: () => setStoreVisibilityFilter('hidden'), className: `px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${storeVisibilityFilter === 'hidden' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-rose-700 hover:bg-rose-50'}`, children: [_jsx(EyeOff, { className: "w-3 h-3" }), `Hidden (${hiddenStoresCount})`] })
        ] })
    ] }),
    (isAddingStore || editingStore) && (_jsxs("form", { onSubmit: handleSaveStore, className: "bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs", children: [
        _jsx("h4", { className: "font-extrabold text-xs text-gray-800 uppercase tracking-wider", children: isAddingStore ? 'Add New Store' : 'Edit Store Details' }),
        _jsxs("div", { className: "space-y-2.5 text-xs", children: [
            _jsxs("div", { children: [
                _jsx("label", { className: "block font-bold mb-1", children: "Store Name" }),
                _jsx("input", { type: "text", required: true, value: storeForm.name, onChange: e => setStoreForm({ ...storeForm, name: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl", placeholder: "e.g. KFC, Subway, Vaango" })
            ] }),
            _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                _jsxs("div", { children: [
                    _jsx("label", { className: "block font-bold mb-1", children: "Delivery Time" }),
                    _jsx("input", { type: "text", value: storeForm.deliveryTime, onChange: e => setStoreForm({ ...storeForm, deliveryTime: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl", placeholder: "e.g. 20-30 mins" })
                ] }),
                _jsxs("div", { children: [
                    _jsx("label", { className: "block font-bold mb-1", children: "Platform Fee (\u20B9)" }),
                    _jsx("input", { type: "number", value: storeForm.deliveryFee, onChange: e => setStoreForm({ ...storeForm, deliveryFee: Number(e.target.value) }), className: "w-full p-2 border border-gray-200 rounded-xl" })
                ] })
            ] }),
            _jsxs("div", { className: "p-3 bg-rose-50/60 rounded-xl border border-rose-100 space-y-2", children: [
                _jsxs("div", { className: "flex items-center gap-1.5 font-extrabold text-rose-800 text-xs", children: [
                    _jsx(Clock, { className: "w-3.5 h-3.5 text-red-600" }),
                    _jsx("span", { children: "Store Operating Timings (Database Controlled)" })
                ] }),
                _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                    _jsxs("div", { children: [
                        _jsx("label", { className: "block font-bold text-gray-700 mb-1 text-[11px]", children: "Opening Time (24h)" }),
                        _jsx("input", { type: "time", required: true, value: storeForm.openTime || '11:00', onChange: e => setStoreForm({ ...storeForm, openTime: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-lg bg-white font-semibold text-xs" }),
                        _jsxs("span", { className: "text-[10px] text-gray-500 mt-1 block font-medium", children: ["Opens at: ", _jsx("strong", { className: "text-gray-800", children: formatTimeTo12Hour(storeForm.openTime || '11:00', '11:00 AM') })] })
                    ] }),
                    _jsxs("div", { children: [
                        _jsx("label", { className: "block font-bold text-gray-700 mb-1 text-[11px]", children: "Closing Time (24h)" }),
                        _jsx("input", { type: "time", required: true, value: storeForm.closeTime || '23:00', onChange: e => setStoreForm({ ...storeForm, closeTime: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-lg bg-white font-semibold text-xs" }),
                        _jsxs("span", { className: "text-[10px] text-gray-500 mt-1 block font-medium", children: ["Closes at: ", _jsx("strong", { className: "text-gray-800", children: formatTimeTo12Hour(storeForm.closeTime || '23:00', '11:00 PM') })] })
                    ] })
                ] }),
                _jsx("p", { className: "text-[10px] text-rose-600 font-medium", children: "Customers will see \"OPENS AT ...\" label on the home store card based on this opening time." })
            ] }),
            _jsxs("div", { className: `p-3 rounded-xl border space-y-1.5 transition-colors ${storeForm.isVisible !== false ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`, children: [
                _jsxs("div", { className: "flex items-center justify-between", children: [
                    _jsxs("div", { className: "flex items-center gap-2", children: [
                        _jsx("div", { className: `p-1.5 rounded-lg ${storeForm.isVisible !== false ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`, children: storeForm.isVisible !== false ? _jsx(Eye, { className: "w-4 h-4" }) : _jsx(EyeOff, { className: "w-4 h-4" }) }),
                        _jsxs("div", { children: [
                            _jsx("span", { className: "block font-extrabold text-xs text-gray-900", children: "Store Website Visibility" }),
                            _jsx("span", { className: "text-[10px] text-gray-500 font-medium", children: storeForm.isVisible !== false ? "Visible to customers on home screen and search" : "Hidden from customers on the website" })
                        ] })
                    ] }),
                    _jsxs("button", {
                        type: "button",
                        onClick: () => setStoreForm({ ...storeForm, isVisible: storeForm.isVisible === false ? true : false }),
                        className: `px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                            storeForm.isVisible !== false
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`,
                        children: [
                            storeForm.isVisible !== false ? _jsx(Eye, { className: "w-3.5 h-3.5" }) : _jsx(EyeOff, { className: "w-3.5 h-3.5" }),
                            _jsx("span", { children: storeForm.isVisible !== false ? "Visible" : "Hidden" })
                        ]
                    })
                ] })
            ] }),
            _jsxs("div", { children: [
                _jsx("label", { className: "block font-bold mb-1", children: "Cuisines (comma separated)" }),
                _jsx("input", { type: "text", value: storeForm.cuisines, onChange: e => setStoreForm({ ...storeForm, cuisines: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl", placeholder: "e.g. Pizzas, Desserts, Burgers" })
            ] }),
            _jsxs("div", { children: [
                _jsx("label", { className: "block font-bold mb-1", children: "Store Card Image URL" }),
                _jsx("input", { type: "text", value: storeForm.image, onChange: e => setStoreForm({ ...storeForm, image: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl", placeholder: "Image URL or local path" })
            ] }),
            _jsxs("div", { children: [
                _jsx("label", { className: "block font-bold mb-1", children: "Store Ordering Status" }),
                _jsxs("select", { value: storeForm.isOpen === undefined ? 'auto' : storeForm.isOpen ? 'open' : 'closed', onChange: e => setStoreForm({ ...storeForm, isOpen: e.target.value === 'auto' ? undefined : (e.target.value === 'open') }), className: "w-full p-2 border border-gray-200 rounded-xl bg-white font-medium text-xs", children: [
                    _jsx("option", { value: "auto", children: "⏱️ Auto (Follow schedule hours)" }),
                    _jsx("option", { value: "open", children: "🟢 Force Open (Accept orders now)" }),
                    _jsx("option", { value: "closed", children: "🔴 Force Closed (Disable ordering)" })
                ] })
            ] }),
            _jsxs("div", { className: "p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 space-y-2.5", children: [
                _jsxs("div", { className: "flex items-center justify-between", children: [
                    _jsxs("div", { className: "flex items-center gap-1.5 font-extrabold text-amber-900 text-xs", children: [
                        _jsx(Tag, { className: "w-3.5 h-3.5 text-amber-600" }),
                        _jsx("span", { children: "Store Discount & Minimum Order Value" })
                    ] }),
                    _jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700", children: [
                        _jsx("input", { type: "checkbox", checked: Boolean(storeForm.discountActive), onChange: e => setStoreForm({ ...storeForm, discountActive: e.target.checked, discountAmount: e.target.checked ? (storeForm.discountAmount || 40) : 0, minOrderValue: e.target.checked ? (storeForm.minOrderValue || 150) : 0 }), className: "rounded text-red-600 focus:ring-red-500 cursor-pointer" }),
                        _jsx("span", { children: storeForm.discountActive ? "Active" : "Disabled" })
                    ] })
                ] }),
                storeForm.discountActive && (
                    _jsxs("div", { className: "space-y-2 pt-1 border-t border-amber-200/60", children: [
                        _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                            _jsxs("div", { children: [
                                _jsx("label", { className: "block font-bold text-gray-700 mb-1 text-[11px]", children: "Discount Amount (₹)" }),
                                _jsx("input", { type: "number", min: "1", required: true, value: storeForm.discountAmount ?? 40, onChange: e => setStoreForm({ ...storeForm, discountAmount: Number(e.target.value) }), className: "w-full p-2 border border-amber-200 rounded-lg bg-white font-bold text-xs", placeholder: "e.g. 40" })
                            ] }),
                            _jsxs("div", { children: [
                                _jsx("label", { className: "block font-bold text-gray-700 mb-1 text-[11px]", children: "Min Order Value (₹)" }),
                                _jsx("input", { type: "number", min: "0", value: storeForm.minOrderValue ?? 150, onChange: e => setStoreForm({ ...storeForm, minOrderValue: Number(e.target.value) }), className: "w-full p-2 border border-amber-200 rounded-lg bg-white font-bold text-xs", placeholder: "0 for no minimum" })
                            ] })
                        ] }),
                        _jsxs("div", { className: "text-[10px] text-amber-900 font-semibold bg-white p-2 rounded-lg border border-amber-200/80 flex items-center justify-between", children: [
                            _jsx("span", { children: "Customer Preview:" }),
                            _jsxs("span", { className: "px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black", children: ["🏷️ ", formatDiscountLabel(storeForm.discountAmount || 0, storeForm.minOrderValue || 0)] })
                        ] })
                    ] })
                )
            ] })
        ] }),
        _jsxs("div", { className: "flex space-x-2 pt-2", children: [
            _jsx("button", { type: "submit", className: "px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 cursor-pointer", children: "Save Store" }),
            _jsx("button", { type: "button", onClick: () => {
                setIsAddingStore(false);
                setEditingStore(null);
            }, className: "px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer", children: "Cancel" })
        ] })
    ] })),
    filteredAdminStores.length === 0 ? (
        _jsxs("div", { className: "bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs space-y-2", children: [
            _jsx("p", { className: "text-sm font-bold text-gray-800", children: "No stores match your search or filter" }),
            _jsx("button", { type: "button", onClick: () => { setStoreSearchQuery(''); setStoreVisibilityFilter('all'); }, className: "text-xs font-bold text-red-600 hover:underline cursor-pointer", children: "Reset filters" })
        ] })
    ) : (
        _jsx("div", { className: "space-y-3", children: filteredAdminStores.map(store => {
            const status = getOrderWindowStatus(store.id, undefined, store);
            const manualSetting = store.isOpen !== undefined ? (store.isOpen ? 'open' : 'closed') : (getStoreManualOverride(store.id) || 'auto');
            const isAuto = manualSetting === 'auto';
            const storeDiscount = getStoreDiscount(store);
            const isStoreVisible = store.isVisible !== false;
            return (
                _jsxs("div", { className: `bg-white p-4 rounded-2xl border shadow-xs space-y-3 transition-all ${!isStoreVisible ? 'border-rose-200 bg-linear-to-r from-rose-50/20 to-white' : 'border-gray-100'}`, children: [
                    _jsxs("div", { className: "flex items-center justify-between", children: [
                        _jsxs("div", { className: "flex items-center space-x-3 min-w-0", children: [
                            _jsx("img", { src: store.image, alt: store.name, className: `w-12 h-12 rounded-xl object-cover border shrink-0 ${!isStoreVisible ? 'grayscale opacity-75' : ''}`, onError: e => {
                                e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                            } }),
                            _jsxs("div", { className: "min-w-0", children: [
                                _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                                    _jsx("h4", { className: "font-extrabold text-sm text-gray-900 truncate", children: store.name }),
                                    _jsx("span", { className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${status.isOpen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`, children: status.isOpen ? '● Open' : '○ Closed' }),
                                    isStoreVisible ? (
                                        _jsxs("span", { className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0", children: [
                                            _jsx(Eye, { className: "w-2.5 h-2.5" }),
                                            _jsx("span", { children: "Live" })
                                        ] })
                                    ) : (
                                        _jsxs("span", { className: "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0", children: [
                                            _jsx(EyeOff, { className: "w-2.5 h-2.5" }),
                                            _jsx("span", { children: "Hidden" })
                                        ] })
                                    )
                                ] }),
                                _jsx("p", { className: "text-xs text-gray-500 truncate mt-0.5", children: store.cuisines?.join(', ') || 'Fast Food' }),
                                _jsxs("div", { className: "flex items-center gap-1.5 text-[11px] text-gray-600 font-semibold mt-1", children: [
                                    _jsx(Clock, { className: "w-3 h-3 text-red-500 shrink-0" }),
                                    _jsxs("span", { children: ["Timings: ", status.timingLabel] })
                                ] })
                            ] })
                        ] }),
                        _jsxs("div", { className: "flex items-center space-x-1.5 shrink-0", children: [
                            _jsx("button", { onClick: () => startEditStore(store), className: "p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer", title: "Edit Store", children: _jsx(Edit3, { className: "w-3.5 h-3.5" }) }),
                            _jsx("button", { onClick: () => handleDeleteStore(store.id), className: "p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer", title: "Delete Store", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })
                        ] })
                    ] }),
                    _jsxs("div", { className: `p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        isStoreVisible
                            ? 'bg-emerald-50/60 border-emerald-200/90'
                            : 'bg-rose-50/70 border-rose-200/90'
                    }`, children: [
                        _jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
                            _jsx("div", { className: `p-2 rounded-xl shrink-0 ${
                                isStoreVisible ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
                            }`, children: isStoreVisible ? _jsx(Eye, { className: "w-4 h-4" }) : _jsx(EyeOff, { className: "w-4 h-4" }) }),
                            _jsxs("div", { className: "min-w-0", children: [
                                _jsxs("div", { className: "flex items-center gap-1.5", children: [
                                    _jsx("span", { className: `font-black text-xs ${
                                        isStoreVisible ? 'text-emerald-950' : 'text-rose-950'
                                    }`, children: isStoreVisible ? "Visible on Website" : "Hidden from Website" }),
                                    _jsx("span", { className: `px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                        isStoreVisible ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`, children: isStoreVisible ? "LIVE" : "HIDDEN" })
                                ] }),
                                _jsx("p", { className: "text-[10px] text-gray-500 font-medium truncate mt-0.5", children: isStoreVisible ? "Customers can see and order from this store on website" : "Hidden: customers cannot see or search for this store" })
                            ] })
                        ] }),
                        _jsxs("button", {
                            type: "button",
                            onClick: () => handleToggleStoreVisibility(store.id),
                            className: `px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs ${
                                isStoreVisible
                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                            }`,
                            title: isStoreVisible ? "Hide this store from customer website" : "Make this store visible on customer website",
                            children: [
                                isStoreVisible ? _jsx(EyeOff, { className: "w-3.5 h-3.5" }) : _jsx(Eye, { className: "w-3.5 h-3.5" }),
                                _jsx("span", { children: isStoreVisible ? "Hide Store" : "Show Store" })
                            ]
                        })
                    ] }),
                    _jsxs("div", { className: "flex items-center justify-between bg-amber-50/60 p-2 rounded-xl border border-amber-100 text-xs", children: [
                        _jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [
                            _jsx(Tag, { className: "w-3.5 h-3.5 text-amber-600 shrink-0" }),
                            _jsx("span", { className: "font-bold text-gray-700 text-[11px] shrink-0", children: "Discount:" }),
                            storeDiscount ? (
                                _jsxs("span", { className: "font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] truncate", children: [
                                    "🏷️ ", storeDiscount.label
                                ] })
                            ) : (
                                _jsx("span", { className: "text-gray-400 font-medium text-[11px]", children: "No discount active" })
                            )
                        ] }),
                        _jsxs("button", { type: "button", onClick: () => {
                            setDiscountForm({
                                discountActive: Boolean(storeDiscount),
                                discountAmount: storeDiscount?.amount || 40,
                                minOrderValue: storeDiscount?.minOrder || 150,
                            });
                            setEditingDiscountStoreId(store.id);
                            setActiveSubTab('discounts');
                        }, className: "text-[11px] font-bold text-red-600 hover:text-red-700 underline shrink-0 cursor-pointer", children: "Manage Discount →" })
                    ] }),
                    _jsxs("div", { className: "pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs", children: [
                        _jsxs("div", { className: "flex items-center space-x-1.5 text-[11px] font-medium text-gray-500", children: [
                            _jsx("span", { children: "Status:" }),
                            _jsx("span", { className: `font-bold ${status.isOpen ? 'text-emerald-700' : 'text-rose-700'}`, children: status.isOpen ? 'Open for Orders' : 'Closed for Orders' }),
                            !isAuto && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold", children: "Manual Override" }))
                        ] }),
                        _jsxs("div", { className: "flex items-center bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold", children: [
                            _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'open'), className: `px-3 py-1 rounded-lg transition-all cursor-pointer ${manualSetting === 'open' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'}`, title: "Force Open Store", children: "🟢 Open" }),
                            _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'closed'), className: `px-3 py-1 rounded-lg transition-all cursor-pointer ${manualSetting === 'closed' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-rose-700'}`, title: "Force Close Store", children: "🔴 Close" }),
                            _jsx("button", { type: "button", onClick: () => handleToggleStoreStatus(store.id, 'auto'), className: `px-2 py-1 rounded-lg transition-all cursor-pointer ${isAuto ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-700'}`, title: "Follow Schedule", children: "⏱️ Auto" })
                        ] })
                    ] })
                ] }, store.id)
            );
        }) })
    )
] })), activeSubTab === 'discounts' && (_jsxs("div", { className: "space-y-4", children: [
    _jsxs("div", { className: "bg-linear-to-r from-red-600 to-rose-600 rounded-2xl p-4 text-white shadow-sm space-y-2.5", children: [
        _jsxs("div", { className: "flex items-center space-x-2", children: [
            _jsx(Tag, { className: "w-5 h-5 text-rose-200" }),
            _jsx("h3", { className: "font-black text-base", children: "All Stores Discount Controls" })
        ] }),
        _jsx("p", { className: "text-xs text-rose-100 leading-relaxed", children: "Set custom discount amounts (₹), configure minimum order requirements, or add/remove discounts for any store. Live customer checkout and badge previews update immediately." }),
        _jsxs("div", { className: "grid grid-cols-3 gap-2 pt-1 text-center", children: [
            _jsxs("div", { className: "bg-white/15 backdrop-blur-xs p-2 rounded-xl border border-white/20", children: [
                _jsx("div", { className: "text-[10px] uppercase font-bold text-rose-200", children: "Discounts Active" }),
                _jsxs("div", { className: "text-base font-black text-white", children: [storesWithDiscount.length, " / ", stores.length] })
            ] }),
            _jsxs("div", { className: "bg-white/15 backdrop-blur-xs p-2 rounded-xl border border-white/20", children: [
                _jsx("div", { className: "text-[10px] uppercase font-bold text-rose-200", children: "No Discount" }),
                _jsx("div", { className: "text-base font-black text-white", children: stores.length - storesWithDiscount.length })
            ] }),
            _jsxs("div", { className: "bg-white/15 backdrop-blur-xs p-2 rounded-xl border border-white/20", children: [
                _jsx("div", { className: "text-[10px] uppercase font-bold text-rose-200", children: "Avg Discount" }),
                _jsxs("div", { className: "text-base font-black text-white", children: ["₹", averageDiscountAmount] })
            ] })
        ] })
    ] }),
    _jsxs("div", { className: "flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between", children: [
        _jsxs("div", { className: "relative flex-1", children: [
            _jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-2.5" }),
            _jsx("input", { type: "text", value: discountSearchQuery, onChange: e => setDiscountSearchQuery(e.target.value), placeholder: "Search store by name or cuisine...", className: "w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 shadow-xs" })
        ] }),
        _jsxs("div", { className: "flex bg-gray-100 p-1 rounded-xl text-xs font-bold shrink-0", children: [
            _jsxs("button", { type: "button", onClick: () => setDiscountFilter('all'), className: `px-3 py-1 rounded-lg transition-all cursor-pointer ${discountFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["All (", stores.length, ")"] }),
            _jsxs("button", { type: "button", onClick: () => setDiscountFilter('active'), className: `px-3 py-1 rounded-lg transition-all cursor-pointer ${discountFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["Active (", storesWithDiscount.length, ")"] }),
            _jsxs("button", { type: "button", onClick: () => setDiscountFilter('inactive'), className: `px-3 py-1 rounded-lg transition-all cursor-pointer ${discountFilter === 'inactive' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["None (", stores.length - storesWithDiscount.length, ")"] })
        ] })
    ] }),
    _jsx("div", { className: "space-y-3", children: filteredDiscountStores.length === 0 ? (
        _jsxs("div", { className: "bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-2", children: [
            _jsx(Tag, { className: "w-8 h-8 text-gray-300 mx-auto" }),
            _jsx("p", { className: "text-sm font-bold text-gray-700", children: "No stores match your discount search" }),
            _jsx("p", { className: "text-xs text-gray-400", children: "Try clearing search filter or switching to 'All'" })
        ] })
    ) : (
        filteredDiscountStores.map(store => {
            const currentDiscount = getStoreDiscount(store);
            const isEditing = editingDiscountStoreId === store.id;
            return (
                _jsxs("div", { className: `bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${isEditing ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-100'}`, children: [
                    _jsxs("div", { className: "p-4 space-y-3", children: [
                        _jsxs("div", { className: "flex items-center justify-between gap-3", children: [
                            _jsxs("div", { className: "flex items-center space-x-3 min-w-0", children: [
                                _jsx("img", { src: store.image, alt: store.name, className: "w-12 h-12 rounded-xl object-cover border shrink-0", onError: e => {
                                    e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                                } }),
                                _jsxs("div", { className: "min-w-0", children: [
                                    _jsx("h4", { className: "font-extrabold text-sm text-gray-900 truncate", children: store.name }),
                                    _jsx("p", { className: "text-xs text-gray-400 truncate mt-0.5", children: store.cuisines?.join(', ') || 'Fast Food' }),
                                    _jsxs("div", { className: "mt-1.5 flex items-center gap-2", children: [
                                        currentDiscount ? (
                                            _jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-black", children: [
                                                _jsx(Tag, { className: "w-3 h-3 text-emerald-600" }),
                                                _jsx("span", { children: currentDiscount.label })
                                            ] })
                                        ) : (
                                            _jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold", children: "No discount offer" })
                                        )
                                    ] })
                                ] })
                            ] }),
                            _jsxs("div", { className: "flex flex-col items-end gap-1.5 shrink-0", children: [
                                _jsxs("button", { type: "button", onClick: () => {
                                    if (isEditing) {
                                        setEditingDiscountStoreId(null);
                                    } else {
                                        setEditingDiscountStoreId(store.id);
                                        setDiscountForm({
                                            discountActive: Boolean(currentDiscount),
                                            discountAmount: currentDiscount?.amount || 40,
                                            minOrderValue: currentDiscount?.minOrder || 150,
                                        });
                                    }
                                }, className: `px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${isEditing ? 'bg-gray-200 text-gray-800' : 'bg-red-50 text-red-600 hover:bg-red-100'}`, children: [
                                    _jsx(Edit3, { className: "w-3.5 h-3.5" }),
                                    _jsx("span", { children: isEditing ? 'Close' : (currentDiscount ? 'Edit Discount' : 'Add Discount') })
                                ] }),
                                currentDiscount && (_jsxs("button", { type: "button", onClick: () => handleRemoveStoreDiscount(store.id), className: "text-[10px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer", children: "Remove Discount" }))
                            ] })
                        ] })
                    ] }),
                    isEditing && (
                        _jsxs("div", { className: "p-4 bg-gray-50/90 border-t border-gray-100 space-y-3.5", children: [
                            _jsxs("div", { className: "flex items-center justify-between", children: [
                                _jsxs("h5", { className: "font-extrabold text-xs text-gray-900 flex items-center gap-1.5", children: [
                                    _jsx(Percent, { className: "w-3.5 h-3.5 text-red-600" }),
                                    _jsxs("span", { children: ["Configure Discount for ", store.name] })
                                ] }),
                                _jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-700", children: [
                                    _jsx("input", { type: "checkbox", checked: discountForm.discountActive, onChange: e => setDiscountForm({ ...discountForm, discountActive: e.target.checked }), className: "rounded text-red-600 focus:ring-red-500 cursor-pointer" }),
                                    _jsx("span", { children: discountForm.discountActive ? "Discount Active" : "Disabled" })
                                ] })
                            ] }),
                            _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                                _jsxs("div", { className: "space-y-1", children: [
                                    _jsxs("label", { className: "block font-bold text-xs text-gray-700", children: ["Discount Amount (\u20B9)", _jsx("span", { className: "text-red-500 ml-0.5", children: "*" })] }),
                                    _jsx("div", { className: "relative", children: [
                                        _jsx("span", { className: "absolute left-2.5 top-2 text-gray-400 font-bold text-xs", children: "\u20B9" }),
                                        _jsx("input", { type: "number", min: "1", value: discountForm.discountAmount, onChange: e => setDiscountForm({ ...discountForm, discountAmount: Number(e.target.value) }), className: "w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded-xl bg-white font-extrabold text-xs text-gray-900", placeholder: "e.g. 40" })
                                    ] }),
                                    _jsx("p", { className: "text-[10px] text-gray-400", children: "Exact amount subtracted from order total" })
                                ] }),
                                _jsxs("div", { className: "space-y-1", children: [
                                    _jsxs("label", { className: "block font-bold text-xs text-gray-700", children: ["Minimum Order Value (\u20B9)", _jsx("span", { className: "text-gray-400 ml-1 font-normal text-[10px]", children: "(0 = No min)" })] }),
                                    _jsx("div", { className: "relative", children: [
                                        _jsx("span", { className: "absolute left-2.5 top-2 text-gray-400 font-bold text-xs", children: "\u20B9" }),
                                        _jsx("input", { type: "number", min: "0", value: discountForm.minOrderValue, onChange: e => setDiscountForm({ ...discountForm, minOrderValue: Number(e.target.value) }), className: "w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded-xl bg-white font-extrabold text-xs text-gray-900", placeholder: "e.g. 150" })
                                    ] }),
                                    _jsx("p", { className: "text-[10px] text-gray-400", children: "Cart threshold to unlock this discount" })
                                ] })
                            ] }),
                            _jsxs("div", { className: "space-y-1.5", children: [
                                _jsx("span", { className: "text-[11px] font-bold text-gray-600 block", children: "⚡ Quick Discount Presets:" }),
                                _jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
                                    _jsx("button", { type: "button", onClick: () => setDiscountForm({ discountActive: true, discountAmount: 40, minOrderValue: 150 }), className: "px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 cursor-pointer transition-colors", children: "\u20B940 OFF above \u20B9150" }),
                                    _jsx("button", { type: "button", onClick: () => setDiscountForm({ discountActive: true, discountAmount: 50, minOrderValue: 200 }), className: "px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 cursor-pointer transition-colors", children: "\u20B950 OFF above \u20B9200" }),
                                    _jsx("button", { type: "button", onClick: () => setDiscountForm({ discountActive: true, discountAmount: 100, minOrderValue: 400 }), className: "px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 cursor-pointer transition-colors", children: "\u20B9100 OFF above \u20B9400" }),
                                    _jsx("button", { type: "button", onClick: () => setDiscountForm({ discountActive: true, discountAmount: 30, minOrderValue: 0 }), className: "px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 cursor-pointer transition-colors", children: "Flat \u20B930 OFF (No Min)" })
                                ] })
                            ] }),
                            _jsxs("div", { className: "p-2.5 bg-white rounded-xl border border-gray-200 space-y-1", children: [
                                _jsx("div", { className: "text-[10px] font-black uppercase tracking-wider text-gray-400", children: "Live Customer Preview" }),
                                _jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                                    _jsx("span", { className: "text-gray-600 font-medium", children: "Badge on Store Card:" }),
                                    _jsxs("span", { className: "px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-black text-[11px]", children: [
                                        "\uD83C\uDFF7\uFE0F ", formatDiscountLabel(discountForm.discountAmount, discountForm.minOrderValue)
                                    ] })
                                ] }),
                                discountForm.minOrderValue > 0 && (_jsxs("div", { className: "text-[10px] text-gray-500 pt-0.5", children: [
                                    "Cart reminder: ", _jsxs("span", { className: "font-semibold text-red-600", children: ["\"Add \u20B9X more to get \u20B9", discountForm.discountAmount, " OFF!\""] })
                                ] }))
                            ] }),
                            _jsxs("div", { className: "flex items-center justify-between pt-1", children: [
                                _jsxs("div", { className: "flex items-center space-x-2", children: [
                                    _jsx("button", { type: "button", onClick: () => handleSaveStoreDiscount(store.id, discountForm), className: "px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs", children: "Save Discount" }),
                                    _jsx("button", { type: "button", onClick: () => setEditingDiscountStoreId(null), className: "px-3 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer", children: "Cancel" })
                                ] }),
                                currentDiscount && (_jsx("button", { type: "button", onClick: () => handleRemoveStoreDiscount(store.id), className: "px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer", children: "Delete / Remove" }))
                            ] })
                        ] })
                    )
                ] }, store.id)
            );
        })
    ) })
] })), activeSubTab === 'items' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col space-y-2", children: [_jsx("label", { className: "text-xs font-black text-gray-500 uppercase tracking-wider", children: "Select Store to Edit Menu" }), _jsx("select", { value: selectedStoreId, onChange: e => setSelectedStoreId(e.target.value), className: "w-full p-2 border border-gray-200 rounded-xl text-xs bg-white font-bold", children: stores.map(s => (_jsx("option", { value: s.id, children: s.name }, s.id))) })] }), selectedStoreId && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h3", { className: "font-extrabold text-sm text-gray-900", children: ["Menu of ", stores.find(s => s.id === selectedStoreId)?.name] }), _jsxs("button", { onClick: () => {
                                                    setIsAddingItem(true);
                                                    setEditingItem(null);
                                                }, className: "flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Add Menu Item" })] })] }), (isAddingItem || editingItem) && (_jsxs("form", { onSubmit: handleSaveItem, className: "bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs", children: [_jsx("h4", { className: "font-extrabold text-xs text-gray-800 uppercase tracking-wider", children: isAddingItem ? 'Add New Menu Item' : 'Edit Menu Item' }), _jsxs("div", { className: "space-y-2 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Item Name" }), _jsx("input", { type: "text", required: true, value: itemForm.name, onChange: e => setItemForm({ ...itemForm, name: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Price (\u20B9)" }), _jsx("input", { type: "number", required: true, value: itemForm.price, onChange: e => setItemForm({ ...itemForm, price: Number(e.target.value) }), className: "w-full p-2 border border-gray-200 rounded-xl" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Category" }), _jsx("input", { type: "text", required: true, value: itemForm.category, onChange: e => setItemForm({ ...itemForm, category: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl", placeholder: "e.g. Veg Pizzas, Scoops" })] })] }), _jsxs("div", { className: "flex space-x-4 py-1", children: [_jsxs("label", { className: "flex items-center space-x-1.5 font-bold cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: itemForm.isVeg, onChange: e => setItemForm({ ...itemForm, isVeg: e.target.checked }) }), _jsx("span", { children: "Pure Veg" })] }), _jsxs("label", { className: "flex items-center space-x-1.5 font-bold cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: itemForm.isBestseller, onChange: e => setItemForm({ ...itemForm, isBestseller: e.target.checked }) }), _jsx("span", { children: "Bestseller Tag" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Description" }), _jsx("textarea", { value: itemForm.description, onChange: e => setItemForm({ ...itemForm, description: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl h-16 resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Item Image URL" }), _jsx("input", { type: "text", value: itemForm.image, onChange: e => setItemForm({ ...itemForm, image: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl" })] })] }), _jsxs("div", { className: "flex space-x-2 pt-2", children: [_jsx("button", { type: "submit", className: "px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800", children: "Save Item" }), _jsx("button", { type: "button", onClick: () => {
                                                            setIsAddingItem(false);
                                                            setEditingItem(null);
                                                        }, className: "px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200", children: "Cancel" })] })] })), _jsx("div", { className: "space-y-2", children: (stores.find(s => s.id === selectedStoreId)?.items || []).map(item => (_jsxs("div", { className: "bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-xs", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("img", { src: item.image, alt: item.name, className: "w-10 h-10 rounded-lg object-cover border", onError: e => {
                                                                e.target.src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80';
                                                            } }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("span", { className: `w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}` }), _jsx("span", { className: "font-extrabold text-xs text-gray-900", children: item.name })] }), _jsxs("p", { className: "text-[10px] text-gray-500 mt-0.5", children: ["\u20B9", item.price, " \u2022 ", item.category] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => startEditItem(item), className: "p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors", title: "Edit Item", children: _jsx(Edit3, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => handleDeleteItem(item.id), className: "p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors", title: "Delete Item", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] }, item.id))) })] }))] })), activeSubTab === 'categories' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Home Categories Slider" }), _jsxs("button", { onClick: () => {
                                            setIsAddingCategory(true);
                                            setEditingCategory(null);
                                        }, className: "flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Add Category" })] })] }), (isAddingCategory || editingCategory) && (_jsxs("form", { onSubmit: handleSaveCategory, className: "bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs", children: [_jsx("h4", { className: "font-extrabold text-xs text-gray-800 uppercase tracking-wider", children: isAddingCategory ? 'Add Category' : 'Edit Category' }), _jsxs("div", { className: "space-y-2 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Category Name" }), _jsx("input", { type: "text", required: true, value: categoryForm.name, onChange: e => setCategoryForm({ ...categoryForm, name: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold mb-1", children: "Image URL" }), _jsx("input", { type: "text", value: categoryForm.image, onChange: e => setCategoryForm({ ...categoryForm, image: e.target.value }), className: "w-full p-2 border border-gray-200 rounded-xl" })] })] }), _jsxs("div", { className: "flex space-x-2 pt-2", children: [_jsx("button", { type: "submit", className: "px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800", children: "Save Category" }), _jsx("button", { type: "button", onClick: () => {
                                                    setIsAddingCategory(false);
                                                    setEditingCategory(null);
                                                }, className: "px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200", children: "Cancel" })] })] })), _jsx("div", { className: "grid grid-cols-2 gap-3", children: categories.map(cat => (_jsxs("div", { className: "bg-white p-3 rounded-2xl border border-gray-100 flex flex-col items-center shadow-xs text-center relative group", children: [_jsx("img", { src: cat.image, alt: cat.name, className: "w-12 h-12 rounded-full object-cover border" }), _jsx("span", { className: "font-extrabold text-xs text-gray-900 mt-2", children: cat.name }), _jsxs("div", { className: "flex items-center space-x-1.5 mt-3", children: [_jsx("button", { onClick: () => startEditCategory(cat), className: "p-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors", children: _jsx(Edit3, { className: "w-3 h-3" }) }), _jsx("button", { onClick: () => handleDeleteCategory(cat.id), className: "p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors", children: _jsx(Trash2, { className: "w-3 h-3" }) })] })] }, cat.id))) })] })), activeSubTab === 'orders' && (_jsxs("div", { className: "space-y-4", children: [
                _jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [
                    _jsxs("div", { children: [
                        _jsxs("div", { className: "flex items-center space-x-2", children: [
                            _jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Live Order Fulfillment Tracker" }),
                            _jsxs("span", { className: "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200", children: [
                                _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" }),
                                _jsx("span", { children: "Live Cloud Sync" })
                            ] })
                        ] }),
                        _jsxs("div", { className: "flex items-center space-x-3 mt-0.5", children: [
                            _jsxs("p", { className: "text-xs text-gray-500", children: ["Total ", orders.length, " orders recorded"] }),
                            _jsxs("button", { onClick: refreshOrders, disabled: isRefreshingOrders, className: "flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer transition-colors", children: [
                                _jsx(RefreshCw, { className: `w-3 h-3 ${isRefreshingOrders ? 'animate-spin' : ''}` }),
                                _jsx("span", { children: isRefreshingOrders ? "Syncing..." : "Refresh" })
                            ] })
                        ] })
                    ] }),
                    _jsxs("div", { className: "flex bg-gray-100 p-1 rounded-xl text-[11px] font-bold flex-wrap gap-1", children: [
                        _jsxs("button", { onClick: () => setOrderFilter('all'), className: `px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["All (", orders.length, ")"] }),
                        _jsxs("button", { onClick: () => setOrderFilter('active'), className: `px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'active' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["Active (", orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, ")"] }),
                        _jsxs("button", { onClick: () => setOrderFilter('delivered'), className: `px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'delivered' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["Delivered (", orders.filter(o => o.status === 'delivered').length, ")"] }),
                        _jsxs("button", { onClick: () => setOrderFilter('cancelled'), className: `px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'cancelled' ? 'bg-white text-rose-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`, children: ["Cancelled (", orders.filter(o => o.status === 'cancelled').length, ")"] })
                    ] })
                ] }),
                _jsxs("div", { className: "relative", children: [
                    _jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" }),
                    _jsx("input", {
                        type: "text",
                        placeholder: "Search orders by customer name, room no, hostel, contact, order ID...",
                        value: orderSearchQuery,
                        onChange: e => setOrderSearchQuery(e.target.value),
                        className: "w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-gray-200 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    }),
                    orderSearchQuery && _jsx("button", {
                        onClick: () => setOrderSearchQuery(''),
                        className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5",
                        children: _jsx(XCircle, { className: "w-3.5 h-3.5" })
                    })
                ] }),
                (() => {
                    const seen = new Set();
                    const uniqueOrders = (orders || []).filter(o => {
                        if (!o || !o.id) return false;
                        if (seen.has(o.id)) return false;
                        seen.add(o.id);
                        return true;
                    });
                    const displayedOrders = uniqueOrders.filter(o => {
                        if (orderFilter === 'active' && (o.status === 'delivered' || o.status === 'cancelled')) return false;
                        if (orderFilter === 'delivered' && o.status !== 'delivered') return false;
                        if (orderFilter === 'cancelled' && o.status !== 'cancelled') return false;
                        if (orderSearchQuery.trim()) {
                            const q = orderSearchQuery.toLowerCase();
                            const matchName = (o.name || '').toLowerCase().includes(q);
                            const matchRoom = (o.roomNo || o['room No.'] || o.room_no || '').toLowerCase().includes(q);
                            const matchHostel = (o.hostel || o.Hostel || '').toLowerCase().includes(q);
                            const matchPhone = (o.contact || o.customerPhone || '').toLowerCase().includes(q);
                            const matchId = (o.orderNumber || o.id || '').toLowerCase().includes(q);
                            const matchStore = (o.store?.name || o.store || '').toLowerCase().includes(q);
                            return matchName || matchRoom || matchHostel || matchPhone || matchId || matchStore;
                        }
                        return true;
                    });
                    if (displayedOrders.length === 0) {
                        return (
                            _jsxs("div", { className: "bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2", children: [
                                _jsx("div", { className: "w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto", children: _jsx(ShoppingBag, { className: "w-6 h-6" }) }),
                                _jsxs("div", { className: "text-xs font-bold text-gray-700", children: [orderSearchQuery ? 'No orders match your search' : `No ${orderFilter === 'all' ? '' : orderFilter} orders found`] }),
                                _jsx("p", { className: "text-[11px] text-gray-400", children: orderSearchQuery ? "Try searching with a different name, room number, or phone." : "When customers place orders, they will appear here live with structured customer details." })
                            ] })
                        );
                    }
                    return (
                        _jsx("div", { className: "space-y-3", children: displayedOrders.map(order => {
                            const storeName = (order.store && typeof order.store === 'object' ? order.store.name : order.store) || 'Foodza Store';
                            const grandTotal = Number(order['grand Total'] ?? order.grand_total ?? order.grandTotal ?? 0);
                            const itemsList = Array.isArray(order.items) ? order.items : [];
                            const customerName = order.name || 'Not provided';
                            const roomNumber = order.roomNo || order['room No.'] || order.room_no || 'N/A';
                            const hostelName = order.hostel || order.Hostel || 'N/A';
                            const contactPhone = order.contact || order.customerPhone || '';
                            const cleanPhone = contactPhone.replace(/\D/g, '');
                            const orderNum = order.orderNumber || (order.id && String(order.id).startsWith('#') ? order.id : `#FD-${String(order.id || '').slice(-5)}`);

                            return (
                                _jsxs("div", { className: "bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3", children: [
                                    _jsxs("div", { className: "flex justify-between items-start", children: [
                                        _jsxs("div", { children: [
                                            _jsx("div", { className: "font-extrabold text-sm text-gray-900", children: storeName }),
                                            _jsxs("div", { className: "text-[10px] text-gray-400 mt-0.5", children: [
                                                "Order ID: ", orderNum,
                                                " • ",
                                                formatOrderDate(order)
                                            ] })
                                        ] }),
                                        _jsx("span", {
                                            className: `px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                order.status === 'delivered'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : order.status === 'cancelled'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                            }`,
                                            children: (order.status || 'pending').replace('_', ' ')
                                        })
                                    ] }),

                                    _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs", children: [
                                        _jsxs("div", { className: "flex items-center space-x-2 min-w-0", children: [
                                            _jsx("div", { className: "w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0", children: _jsx(User, { className: "w-3.5 h-3.5" }) }),
                                            _jsxs("div", { className: "min-w-0", children: [
                                                _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Name" }),
                                                _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", title: customerName, children: customerName })
                                            ] })
                                        ] }),
                                        _jsxs("div", { className: "flex items-center space-x-2 min-w-0", children: [
                                            _jsx("div", { className: "w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0", children: _jsx(Home, { className: "w-3.5 h-3.5" }) }),
                                            _jsxs("div", { className: "min-w-0", children: [
                                                _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Room No." }),
                                                _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", title: roomNumber, children: roomNumber })
                                            ] })
                                        ] }),
                                        _jsxs("div", { className: "flex items-center space-x-2 min-w-0", children: [
                                            _jsx("div", { className: "w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0", children: _jsx(Building, { className: "w-3.5 h-3.5" }) }),
                                            _jsxs("div", { className: "min-w-0", children: [
                                                _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Hostel" }),
                                                _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", title: hostelName, children: hostelName })
                                            ] })
                                        ] }),
                                        _jsxs("div", { className: "flex items-center space-x-2 min-w-0", children: [
                                            _jsx("div", { className: "w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0", children: _jsx(Phone, { className: "w-3.5 h-3.5" }) }),
                                            _jsxs("div", { className: "min-w-0 flex-1", children: [
                                                _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Contact" }),
                                                _jsxs("div", { className: "flex items-center space-x-1", children: [
                                                    contactPhone ? _jsx("a", { href: `tel:${contactPhone}`, className: "font-extrabold text-gray-900 hover:text-emerald-600 truncate text-[11px]", children: contactPhone }) : _jsx("span", { className: "font-extrabold text-gray-400 text-[11px]", children: "N/A" }),
                                                    cleanPhone && _jsx("a", {
                                                        href: `https://wa.me/91${cleanPhone}`,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        className: "p-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded shrink-0",
                                                        title: "WhatsApp Customer",
                                                        children: _jsx(MessageSquare, { className: "w-3 h-3" })
                                                    })
                                                ] })
                                            ] })
                                        ] })
                                    ] }),

                                    (order.deliveryAddress || order.paymentMethod) && (
                                        _jsxs("div", { className: "px-2.5 py-1.5 bg-gray-50/60 rounded-xl flex items-center justify-between text-[10px] text-gray-500", children: [
                                            order.deliveryAddress && _jsxs("div", { className: "flex items-center space-x-1 truncate max-w-[70%]", children: [
                                                _jsx(MapPin, { className: "w-3 h-3 text-red-500 shrink-0" }),
                                                _jsx("span", { className: "truncate", title: order.deliveryAddress, children: order.deliveryAddress })
                                            ] }),
                                            order.paymentMethod && _jsxs("div", { className: "flex items-center space-x-1 shrink-0 font-medium", children: [
                                                _jsx(CreditCard, { className: "w-3 h-3 text-blue-500" }),
                                                _jsx("span", { children: order.paymentMethod })
                                            ] })
                                        ] })
                                    ),

                                    itemsList.length > 0 && (
                                        _jsx("div", { className: "text-xs text-gray-600 pl-2 border-l-2 border-red-200 space-y-1 py-1", children: itemsList.map((item, idx) => (
                                            _jsxs("div", { className: "flex justify-between", children: [
                                                _jsxs("span", { children: [item.quantity, "x ", item.name] }),
                                                _jsxs("span", { className: "font-semibold", children: ["₹", (item.price || 0) * (item.quantity || 1)] })
                                            ] }, idx)
                                        )) })
                                    ),

                                    _jsxs("div", { className: "flex justify-between items-center text-xs pt-2 border-t border-gray-100", children: [
                                        _jsxs("span", { className: "font-bold text-gray-900 text-sm", children: [
                                            "Total: ₹", grandTotal.toFixed(0)
                                        ] }),
                                        _jsxs("div", { className: "flex space-x-2", children: [
                                            order.status !== 'delivered' && order.status !== 'cancelled' && _jsxs("button", {
                                                onClick: () => handleAdvanceStatus(order.id, order.status),
                                                className: "flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                                                children: [
                                                    _jsx("span", { children: "Next Step" }),
                                                    _jsx(ChevronRight, { className: "w-3.5 h-3.5" })
                                                ]
                                            }),
                                            _jsx("button", {
                                                onClick: () => handleCancelOrder(order.id),
                                                className: "px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold transition-all cursor-pointer",
                                                children: "Cancel / Delete"
                                            })
                                        ] })
                                    ] })
                                ] }, order.id || Math.random())
                            );
                        }) })
                    );
                })()
            ] })), activeSubTab === 'cloud' && (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-3 rounded-2xl bg-indigo-50 text-indigo-600", children: _jsx(Database, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-extrabold text-gray-900", children: "⚡ Supabase Cloud Backend" }), _jsx("p", { className: "text-xs text-gray-500", children: "Live PostgreSQL database & Edge Function for stores, menus, and orders" })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { type: "button", onClick: checkDb, disabled: isCheckingDb, title: "Test Supabase connection", className: "p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors cursor-pointer", children: _jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}` }) }), _jsx("span", { className: `px-3 py-1 text-xs font-bold rounded-full border ${dbStatus?.connected
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                            : dbStatus?.connected === false
                                                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                                                : 'bg-amber-100 text-amber-800 border-amber-200'}`, children: isCheckingDb
                                                            ? '⏳ Checking...'
                                                            : dbStatus?.connected
                                                                ? '🟢 Supabase Connected'
                                                                : '🔴 Disconnected / Pending Backend' })] })] }), dbStatus?.error && (_jsxs("div", { className: "p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start space-x-2", children: [_jsx(XCircle, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "font-bold", children: "Database Connection Notice:" }), _jsx("p", { className: "font-mono text-[11px] mt-0.5", children: dbStatus.error })] })] })), cloudStatusMsg && (_jsxs("div", { className: "p-3.5 bg-gray-900 text-white text-xs rounded-2xl flex items-center space-x-2 animate-in fade-in duration-200", children: [_jsx(Check, { className: "w-4 h-4 text-emerald-400 shrink-0" }), _jsx("span", { children: cloudStatusMsg })] })), _jsxs("div", { className: "grid grid-cols-3 gap-2.5 pt-2", children: [_jsxs("div", { className: "bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center", children: [_jsx("div", { className: "text-lg font-black text-gray-900", children: dbStatus?.counts?.stores ?? stores?.length ?? 0 }), _jsx("div", { className: "text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5", children: "Stores in DB" })] }), _jsxs("div", { className: "bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center", children: [_jsx("div", { className: "text-lg font-black text-gray-900", children: dbStatus?.counts?.categories ?? categories?.length ?? 0 }), _jsx("div", { className: "text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5", children: "Categories in DB" })] }), _jsxs("div", { className: "bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center", children: [_jsx("div", { className: "text-lg font-black text-gray-900", children: dbStatus?.counts?.orders ?? orders?.length ?? 0 }), _jsx("div", { className: "text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5", children: "Orders in DB" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2", children: [_jsxs("button", { type: "button", disabled: isFetchingDb, onClick: handleFetchFromPostgres, className: "p-3.5 bg-indigo-50 hover:bg-indigo-100 active:scale-98 border border-indigo-200 text-indigo-900 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs", children: [_jsx(RefreshCw, { className: `w-4 h-4 text-indigo-600 ${isFetchingDb ? 'animate-spin' : ''}` }), _jsx("span", { children: isFetchingDb ? 'Fetching from Supabase...' : '📥 Fetch Data from Supabase' })] }), _jsxs("button", { type: "button", disabled: isCloudSyncing, onClick: async () => {
                                                    setIsCloudSyncing(true);
                                                    setCloudStatusMsg(null);
                                                    try {
                                                        const allStoresToSync = stores && stores.length > 0 ? [...stores] : [...STORES];
                                                        const allCatsToSync = categories && categories.length > 0 ? [...categories] : [...CATEGORIES];
                                                        await saveStoresToDb(allStoresToSync);
                                                        await saveCategoriesToDb(allCatsToSync);
                                                        await seedDatabase(allStoresToSync, allCatsToSync);
                                                        if (orders && orders.length > 0) {
                                                            for (const order of orders) {
                                                                await saveOrderToDb(order);
                                                            }
                                                        }
                                                        onUpdateStores(allStoresToSync);
                                                        onUpdateCategories(allCatsToSync);
                                                        await checkDb();
                                                        setCloudStatusMsg(`✅ Successfully synced ${allStoresToSync.length} stores, ${allCatsToSync.length} categories & ${orders?.length || 0} orders to Supabase!`);
                                                    }
                                                    catch (e) {
                                                        setCloudStatusMsg(`⚠️ Failed to sync to Supabase: ${e?.message || 'Check connection'}`);
                                                    }
                                                    finally {
                                                        setIsCloudSyncing(false);
                                                    }
                                                }, className: "p-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-indigo-500/20", children: [_jsx(Sparkles, { className: `w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}` }), _jsx("span", { children: isCloudSyncing ? 'Syncing to Supabase...' : '📤 Push & Seed to Supabase' })] })] })] }), _jsxs("div", { className: "bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4", children: [_jsxs("div", { className: "border-b border-gray-100 pb-3", children: [_jsx("h3", { className: "text-sm font-bold text-gray-900", children: "⚡ Supabase Backend Info" }), _jsx("p", { className: "text-xs text-gray-500", children: "Hosted serverless Postgres database and Edge Functions" })] }), _jsxs("div", { className: "space-y-3 text-xs text-gray-700", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-bold text-gray-600 block mb-1", children: "Edge Function Endpoint:" }), _jsx("div", { className: "p-3.5 bg-gray-50 rounded-2xl border border-gray-200 font-mono text-[11px] text-gray-800 break-all select-all", children: "https://pdteqhpihbgxcsyrxdgj.supabase.co/functions/v1/food-street" })] }), _jsxs("div", { className: "space-y-2 text-[11px] text-gray-600", children: [_jsx("p", { className: "font-bold text-gray-800", children: "⚡ Supabase Architecture:" }), _jsxs("ul", { className: "list-disc pl-4 space-y-1", children: [_jsxs("li", { children: [_jsx("strong", { children: "PostgreSQL Database" }), ": Tables (stores, categories, orders) hosted on Supabase cloud with Row-Level Security enabled."] }), _jsxs("li", { children: [_jsx("strong", { children: "Serverless Edge Functions" }), ": Deployed Deno Edge Function at /food-street providing REST endpoints."] }), _jsxs("li", { children: [_jsx("strong", { children: "Front-end Integration" }), ": Direct REST communication via services/api.js, with optional local Express proxy."] })] }), _jsxs("div", { className: "pt-2 border-t border-gray-100 space-y-1", children: [_jsx("p", { className: "font-bold text-gray-800", children: "🚀 Status:" }), _jsx("p", { children: "Connected & Deployed on Supabase project pdteqhpihbgxcsyrxdgj" })] })] })] })] })] }))] })] }));
};
