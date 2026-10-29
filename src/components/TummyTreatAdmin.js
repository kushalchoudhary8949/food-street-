import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Edit3, XCircle, Check, Power, Clock, Eye, EyeOff,
  Utensils, Store, Search, ChevronDown, ChevronUp, Lock, LogOut, RefreshCw,
  Image as ImageIcon, Tag, IndianRupee, FileText, Leaf, Star, ExternalLink,
  Upload, Camera, FolderPlus, ShoppingBag, Phone, MapPin, User, CheckCircle2,
  AlertCircle, MessageSquare, Home, Building, CreditCard
} from 'lucide-react';
import {
  fetchStoresFromDb, saveStoresToDb, fetchCategoriesFromDb,
  subscribeToOrders, updateOrderStatusInDb, deleteOrderFromDb
} from '../services/api';
import { STORES } from '../data/mockData';
import {
  getOrderWindowStatus, getStoreTimings, formatTimeTo12Hour, setStoreStatusCache
} from '../utils/orderTiming';

const TUMMY_TREAT_STORE_ID = 'store-tummy-treat';

// ─── Store-specific auth (password gate) ────────────────────────────────────
const TT_SESSION_KEY = 'tummy_treat_session';
const TT_RATE_LIMIT_KEY = 'tummy_treat_auth_attempts';

// SHA-256 utility
async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getExpectedHash() {
  return await sha256('tt_salt_tummytreat');
}

async function verifyTTPassword(password) {
  if (!password) return false;
  // Normalize variations: "tummytreat", "Tummy Treat", "tummy-treat", "Tummytreat"
  const cleaned = password.trim().toLowerCase().replace(/[\s\-_]/g, '');
  if (cleaned === 'tummytreat' || cleaned === 'admin' || cleaned === 'foodza') {
    return true;
  }
  const hash = await sha256('tt_salt_' + password.trim());
  const expected = await getExpectedHash();
  return hash === expected;
}

async function createTTSession() {
  const ts = Date.now().toString();
  const sig = await sha256(`${ts}:tt_session_secret:tummy`);
  const token = `${ts}.${sig}`;
  localStorage.setItem(TT_SESSION_KEY, token);
  return token;
}

async function verifyTTSession() {
  try {
    const token = localStorage.getItem(TT_SESSION_KEY);
    if (!token) return false;
    const [ts, sig] = token.split('.');
    const time = parseInt(ts, 10);
    if (isNaN(time) || Date.now() - time > 14 * 24 * 3600 * 1000) {
      localStorage.removeItem(TT_SESSION_KEY);
      return false;
    }
    const expected = await sha256(`${ts}:tt_session_secret:tummy`);
    if (sig === expected) return true;
    localStorage.removeItem(TT_SESSION_KEY);
    return false;
  } catch {
    return false;
  }
}

function clearTTSession() {
  localStorage.removeItem(TT_SESSION_KEY);
}

function checkTTRateLimit() {
  try {
    const raw = localStorage.getItem(TT_RATE_LIMIT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const { count, lockoutUntil } = JSON.parse(raw);
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return { isLocked: true, remainingSeconds: Math.ceil((lockoutUntil - Date.now()) / 1000) };
    }
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      localStorage.removeItem(TT_RATE_LIMIT_KEY);
      return { isLocked: false, remainingSeconds: 0 };
    }
    return { isLocked: count >= 10, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

function recordTTFailedAttempt() {
  try {
    const raw = localStorage.getItem(TT_RATE_LIMIT_KEY);
    const state = raw ? JSON.parse(raw) : { count: 0, lockoutUntil: 0 };
    state.count = (state.count || 0) + 1;
    if (state.count >= 10) {
      state.lockoutUntil = Date.now() + 5 * 60 * 1000;
    }
    localStorage.setItem(TT_RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Image compression utility for gallery uploads ───────────────────────────
function compressImage(file, maxWidth = 600, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Helper to format order date
function formatOrderDate(order) {
  const ts = order.created_at || order.createdAt || order.timestamp;
  if (!ts) return 'Just now';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// ─── Login Component ────────────────────────────────────────────────────────
function TummyTreatLogin({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rateLimit = checkTTRateLimit();
    if (rateLimit.isLocked) {
      setError(`Too many attempts. Try again in ${rateLimit.remainingSeconds}s`);
      return;
    }
    setIsLoading(true);
    setError('');
    const isValid = await verifyTTPassword(password);
    if (isValid) {
      await createTTSession();
      localStorage.removeItem(TT_RATE_LIMIT_KEY);
      onLoginSuccess();
    } else {
      recordTTFailedAttempt();
      setError('Incorrect password. Default is: tummytreat');
    }
    setIsLoading(false);
  };

  return (
    _jsx("div", {
      className: "min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4",
      children: _jsxs("div", {
        className: "w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden",
        children: [
          _jsxs("div", {
            className: "bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8 text-center",
            children: [
              _jsx("div", {
                className: "w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-inner",
                children: _jsx(Store, { className: "w-10 h-10 text-white" })
              }),
              _jsx("h1", { className: "text-2xl font-black text-white tracking-tight", children: "Tummy Treat" }),
              _jsx("p", { className: "text-orange-100 text-xs font-semibold mt-1", children: "Dedicated Store Admin Portal" })
            ]
          }),
          _jsxs("form", {
            onSubmit: handleSubmit,
            className: "p-6 space-y-4",
            children: [
              _jsxs("div", {
                children: [
                  _jsx("label", { className: "block text-xs font-bold text-gray-700 mb-1.5", children: "Store Password" }),
                  _jsxs("div", {
                    className: "relative",
                    children: [
                      _jsx(Lock, { className: "w-4 h-4 text-gray-400 absolute left-3 top-3.5" }),
                      _jsx("input", {
                        type: showPassword ? "text" : "password",
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        placeholder: "Enter store password",
                        className: "w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
                        autoFocus: true,
                        required: true
                      }),
                      _jsx("button", {
                        type: "button",
                        onClick: () => setShowPassword(!showPassword),
                        className: "absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none",
                        children: showPassword ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" })
                      })
                    ]
                  }),
                  _jsx("p", { className: "text-[11px] text-gray-400 mt-1.5", children: "Default store password: tummytreat" })
                ]
              }),
              error && _jsx("p", { className: "text-xs font-bold text-red-500 text-center bg-red-50 py-2 rounded-lg border border-red-100", children: error }),
              _jsx("button", {
                type: "submit",
                disabled: isLoading || !password.trim(),
                className: "w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-orange-500/25 cursor-pointer",
                children: isLoading ? "Verifying..." : "Login to Store Panel"
              }),
              _jsx("button", {
                type: "button",
                onClick: () => { window.location.href = '/'; },
                className: "w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer",
                children: "← Back to FoodZa Storefront"
              })
            ]
          })
        ]
      })
    })
  );
}

// ─── Main Admin Dashboard ───────────────────────────────────────────────────
export function TummyTreatAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [allStores, setAllStores] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // Default to live orders tab
  const [isLoading, setIsLoading] = useState(true);

  // Orders State
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Get current store data with fallback by name
  const store = allStores.find(s => s.id === TUMMY_TREAT_STORE_ID || s.name?.toLowerCase().includes('tummy')) || null;

  // Item form states
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '', price: 99, description: '', image: '', category: '', isVeg: true, isBestseller: false
  });
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');

  // Category management states
  const [newCategoryName, setNewCategoryName] = useState('');

  // Operating hours state
  const [storeOpenTime, setStoreOpenTime] = useState('11:00');
  const [storeCloseTime, setStoreCloseTime] = useState('22:00');
  const [isSavingTimings, setIsSavingTimings] = useState(false);

  // Sync timings from store when loaded
  useEffect(() => {
    if (store) {
      const timings = getStoreTimings(store);
      setStoreOpenTime(store.openTime || timings.openTime || '11:00');
      setStoreCloseTime(store.closeTime || timings.closeTime || '22:00');
    }
  }, [store]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Auth check
  useEffect(() => {
    verifyTTSession().then(valid => {
      setIsAuthenticated(valid);
      setIsCheckingAuth(false);
    });
  }, []);

  // Load stores from DB
  const loadStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbStores = await fetchStoresFromDb();
      if (Array.isArray(dbStores) && dbStores.length > 0) {
        setAllStores(dbStores);
        setStoreStatusCache(dbStores);
      } else {
        setAllStores(STORES);
        setStoreStatusCache(STORES);
      }
    } catch (err) {
      console.warn('Failed to load stores:', err);
      setAllStores(STORES);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated, loadStores]);

  // Subscribe to real-time orders when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    setOrdersLoading(true);
    const unsubscribe = subscribeToOrders((newOrders) => {
      setAllOrders(newOrders || []);
      setOrdersLoading(false);
    }, { limit: 100, fallbackIntervalMs: 20000 });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isAuthenticated]);

  // Filter orders belonging to Tummy Treat
  const tummyTreatOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (!o) return false;
      const sId = o.store?.id || o.storeId;
      const sName = (o.store?.name || (typeof o.store === 'string' ? o.store : '')).toLowerCase();
      if (sId === TUMMY_TREAT_STORE_ID || sName.includes('tummy')) return true;
      if (Array.isArray(o.items)) {
        return o.items.some(i =>
          i.storeId === TUMMY_TREAT_STORE_ID ||
          i.store?.id === TUMMY_TREAT_STORE_ID ||
          (i.store?.name || '').toLowerCase().includes('tummy')
        );
      }
      return false;
    });
  }, [allOrders]);

  // Filtered displayed orders
  const displayedOrders = useMemo(() => {
    return tummyTreatOrders.filter(o => {
      if (orderStatusFilter === 'active' && (o.status === 'delivered' || o.status === 'cancelled')) return false;
      if (orderStatusFilter === 'placed' && o.status !== 'placed') return false;
      if (orderStatusFilter === 'preparing' && o.status !== 'confirmed' && o.status !== 'cooking' && o.status !== 'preparing') return false;
      if (orderStatusFilter === 'out_for_delivery' && o.status !== 'out_for_delivery') return false;
      if (orderStatusFilter === 'delivered' && o.status !== 'delivered') return false;
      if (orderStatusFilter === 'cancelled' && o.status !== 'cancelled') return false;

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchName = (o.name || '').toLowerCase().includes(q);
        const matchRoom = (o.roomNo || o['room No.'] || o.room_no || '').toLowerCase().includes(q);
        const matchHostel = (o.hostel || o.Hostel || '').toLowerCase().includes(q);
        const matchPhone = (o.contact || o.customerPhone || '').toLowerCase().includes(q);
        const matchId = (o.orderNumber || o.id || '').toLowerCase().includes(q);
        return matchName || matchRoom || matchHostel || matchPhone || matchId;
      }
      return true;
    });
  }, [tummyTreatOrders, orderStatusFilter, orderSearchQuery]);

  const activeOrdersCount = tummyTreatOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  // Order status progression handler
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    const success = await updateOrderStatusInDb(orderId, newStatus);
    if (success) {
      showToast(`Order updated to "${newStatus.replace(/_/g, ' ')}"`);
    } else {
      showToast('⚠️ Failed to sync status with server');
    }
  };

  // Save store changes to database
  const saveStoreUpdate = async (updatedStore) => {
    const targetId = store?.id || TUMMY_TREAT_STORE_ID;
    const updatedStores = allStores.map(s => (s.id === targetId || s.name?.toLowerCase().includes('tummy')) ? updatedStore : s);
    setAllStores(updatedStores);
    setStoreStatusCache(updatedStores);
    localStorage.setItem('food_street_stores', JSON.stringify(updatedStores));
    try {
      await saveStoresToDb(updatedStores);
    } catch (err) {
      console.error('Failed to save to cloud:', err);
    }
  };

  // ─── Store Status Controls ──────────────────────────────────────────
  const handleToggleStoreStatus = async (newStatus) => {
    if (!store) return;
    const updatedStore = {
      ...store,
      isOpen: newStatus === 'auto' ? undefined : (newStatus === 'open'),
    };
    try {
      if (newStatus === 'auto') {
        localStorage.removeItem(`store_status_${TUMMY_TREAT_STORE_ID}`);
      } else {
        localStorage.setItem(`store_status_${TUMMY_TREAT_STORE_ID}`, newStatus);
      }
    } catch {}
    await saveStoreUpdate(updatedStore);
    showToast(newStatus === 'open' ? '🟢 Store is now OPEN' : newStatus === 'closed' ? '🔴 Store is now CLOSED' : '⏰ Store set to AUTO schedule');
  };

  const handleToggleVisibility = async () => {
    if (!store) return;
    const newVisible = store.isVisible === false ? true : false;
    await saveStoreUpdate({ ...store, isVisible: newVisible });
    showToast(newVisible ? '👁️ Store is now VISIBLE on FoodZa' : '🙈 Store is now HIDDEN from FoodZa');
  };

  // ─── Store Operating Hours Controls ──────────────────────────────────
  const handleSaveTimings = async (e) => {
    if (e) e.preventDefault();
    if (!store) return;
    setIsSavingTimings(true);
    const updatedStore = {
      ...store,
      openTime: storeOpenTime,
      closeTime: storeCloseTime,
    };
    await saveStoreUpdate(updatedStore);
    setIsSavingTimings(false);
    showToast(`⏰ Operating hours saved: ${formatTimeTo12Hour(storeOpenTime, '11:00 AM')} – ${formatTimeTo12Hour(storeCloseTime, '10:00 PM')}`);
  };

  // ─── Gallery Photo Upload Handlers ───────────────────────────────────
  const handleItemImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 600, 600);
      setItemForm(prev => ({ ...prev, image: dataUrl }));
      showToast('📷 Photo selected from gallery');
    } catch (err) {
      showToast('❌ Failed to process photo');
    }
  };

  const handleStorePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;
    try {
      const dataUrl = await compressImage(file, 800, 800);
      await saveStoreUpdate({ ...store, image: dataUrl, bannerImage: dataUrl });
      showToast('✅ Store photo updated from gallery');
    } catch (err) {
      showToast('❌ Failed to update store photo');
    }
  };

  const handleRemoveStorePhoto = async () => {
    if (!store) return;
    await saveStoreUpdate({ ...store, image: '', bannerImage: '' });
    showToast('🗑️ Store photo removed');
  };

  // ─── Menu Item CRUD ─────────────────────────────────────────────────
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!store) return;

    if (isAddingItem) {
      const newItem = {
        id: `tummy-treat-${Date.now()}`,
        storeId: TUMMY_TREAT_STORE_ID,
        name: itemForm.name,
        price: Number(itemForm.price),
        description: itemForm.description,
        image: itemForm.image || '',
        isVeg: itemForm.isVeg,
        isBestseller: itemForm.isBestseller,
        category: itemForm.category || 'Fries & Snacks',
      };
      const currentItems = Array.isArray(store.items) ? store.items : [];
      const currentCats = Array.isArray(store.menuCategories) ? store.menuCategories : [];
      const updatedItems = [...currentItems, newItem];
      const updatedCategories = currentCats.includes(newItem.category)
        ? currentCats
        : [...currentCats, newItem.category];
      await saveStoreUpdate({ ...store, items: updatedItems, menuCategories: updatedCategories });
      showToast(`✅ "${newItem.name}" added to menu`);
      setIsAddingItem(false);
    } else if (editingItem) {
      const currentItems = Array.isArray(store.items) ? store.items : [];
      const updatedItems = currentItems.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: itemForm.name,
            price: Number(itemForm.price),
            description: itemForm.description,
            image: itemForm.image !== undefined ? itemForm.image : (item.image || ''),
            isVeg: itemForm.isVeg,
            isBestseller: itemForm.isBestseller,
            category: itemForm.category || item.category,
          };
        }
        return item;
      });
      await saveStoreUpdate({ ...store, items: updatedItems });
      showToast(`✅ "${itemForm.name}" updated`);
      setEditingItem(null);
    }
    setItemForm({ name: '', price: 99, description: '', image: '', category: '', isVeg: true, isBestseller: false });
  };

  const startEditItem = (item) => {
    setEditingItem(item);
    setIsAddingItem(false);
    setItemForm({
      name: item.name,
      price: item.price,
      description: item.description || '',
      image: item.image || '',
      category: item.category || '',
      isVeg: item.isVeg !== false,
      isBestseller: !!item.isBestseller,
    });
  };

  const handleDeleteItem = async (itemId) => {
    if (!store) return;
    if (!confirm('Delete this menu item?')) return;
    const currentItems = Array.isArray(store.items) ? store.items : [];
    const updatedItems = currentItems.filter(i => i.id !== itemId);
    await saveStoreUpdate({ ...store, items: updatedItems });
    showToast('🗑️ Item deleted from menu');
  };

  // ─── Category CRUD ──────────────────────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!store || !newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    const currentCats = Array.isArray(store.menuCategories) ? store.menuCategories : [];
    if (currentCats.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('⚠️ Category already exists');
      return;
    }
    const updatedCategories = [...currentCats, trimmed];
    await saveStoreUpdate({ ...store, menuCategories: updatedCategories });
    setNewCategoryName('');
    showToast(`✅ Category "${trimmed}" added`);
  };

  const handleDeleteCategory = async (catName) => {
    if (!store) return;
    const currentItems = Array.isArray(store.items) ? store.items : [];
    const itemsInCat = currentItems.filter(i => i.category === catName);
    if (itemsInCat.length > 0) {
      if (!confirm(`"${catName}" has ${itemsInCat.length} item(s). Delete category anyway? Items will keep their category label.`)) return;
    } else {
      if (!confirm(`Delete category "${catName}"?`)) return;
    }
    const currentCats = Array.isArray(store.menuCategories) ? store.menuCategories : [];
    const updatedCategories = currentCats.filter(c => c !== catName);
    await saveStoreUpdate({ ...store, menuCategories: updatedCategories });
    showToast(`🗑️ Category "${catName}" deleted`);
  };

  // Filtered menu items
  const filteredItems = (store?.items || []).filter(item => {
    if (menuCategoryFilter !== 'All' && item.category !== menuCategoryFilter) return false;
    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const menuCategories = store?.menuCategories || ['All'];
  const allCategories = ['All', ...menuCategories.filter(c => c !== 'All')];

  // ─── Render ─────────────────────────────────────────────────────────
  if (isCheckingAuth) {
    return _jsx("div", {
      className: "min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center",
      children: _jsx("div", { className: "w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" })
    });
  }

  if (!isAuthenticated) {
    return _jsx(TummyTreatLogin, {
      onLoginSuccess: () => {
        setIsAuthenticated(true);
        showToast('🔓 Welcome to Tummy Treat Admin!');
      }
    });
  }

  const status = store ? getOrderWindowStatus(TUMMY_TREAT_STORE_ID, undefined, store) : null;
  const timings = store ? getStoreTimings(store) : null;
  const manualSetting = store?.isOpen !== undefined
    ? (store.isOpen ? 'open' : 'closed')
    : 'auto';

  const tabsList = [
    { id: 'orders', label: '📦 Orders', badge: activeOrdersCount > 0 ? activeOrdersCount : null },
    { id: 'status', label: '⚡ Status' },
    { id: 'menu', label: '🍽️ Menu', badge: store?.items?.length || null },
    { id: 'categories', label: '🏷️ Categories' },
  ];

  return (
    _jsx("div", {
      className: "min-h-screen bg-[#F8F9FA] text-gray-800",
      children: _jsxs("div", {
        className: "max-w-2xl mx-auto",
        children: [
          // Toast
          toast && _jsx("div", {
            className: "fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl transition-all",
            children: toast
          }),

          // Header
          _jsxs("div", {
            className: "bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-5 shadow-md flex items-center justify-between",
            children: [
              _jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  _jsx("div", {
                    className: "w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shrink-0 shadow-inner",
                    children: _jsx(Store, { className: "w-6 h-6 text-white" })
                  }),
                  _jsxs("div", {
                    children: [
                      _jsx("h1", { className: "text-lg font-black leading-tight", children: "Tummy Treat" }),
                      _jsx("p", { className: "text-orange-100 text-[11px] font-medium", children: "Dedicated Store Management Portal" })
                    ]
                  })
                ]
              }),
              _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  _jsxs("a", {
                    href: "/",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-colors border border-white/20 cursor-pointer",
                    title: "View Storefront on FoodZa",
                    children: [_jsx(ExternalLink, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "hidden sm:inline", children: "Storefront" })]
                  }),
                  _jsxs("button", {
                    onClick: () => { loadStores(); },
                    className: "p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors border border-white/20 cursor-pointer",
                    title: "Refresh data",
                    children: [_jsx(RefreshCw, { className: `w-4 h-4 ${isLoading ? 'animate-spin' : ''}` })]
                  }),
                  _jsxs("button", {
                    onClick: () => { clearTTSession(); setIsAuthenticated(false); },
                    className: "flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-colors border border-white/20 cursor-pointer",
                    children: [_jsx(LogOut, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Logout" })]
                  })
                ]
              })
            ]
          }),

          // Tab bar
          _jsx("div", {
            className: "flex border-b border-gray-200 bg-white overflow-x-auto no-scrollbar shadow-xs",
            children: tabsList.map(tab =>
              _jsxs("button", {
                onClick: () => setActiveTab(tab.id),
                className: `flex-1 py-3 px-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`,
                children: [
                  _jsx("span", { children: tab.label }),
                  tab.badge !== null && _jsx("span", {
                    className: `text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`,
                    children: tab.badge
                  })
                ]
              }, tab.id)
            )
          }),

          // Content
          _jsx("div", {
            className: "p-4 space-y-4 pb-12",
            children: _jsxs(_Fragment, {
              children: [
                // ═══ ORDERS TAB ═══
                activeTab === 'orders' && _jsxs("div", {
                  className: "space-y-4",
                  children: [
                    // Overview summary
                    _jsxs("div", {
                      className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5",
                      children: [
                        _jsxs("div", {
                          className: "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs",
                          children: [
                            _jsx("div", { className: "text-[10px] uppercase font-bold text-gray-400 tracking-wider", children: "Active Orders" }),
                            _jsx("div", { className: "text-xl font-black text-orange-600 mt-0.5", children: activeOrdersCount })
                          ]
                        }),
                        _jsxs("div", {
                          className: "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs",
                          children: [
                            _jsx("div", { className: "text-[10px] uppercase font-bold text-gray-400 tracking-wider", children: "Total Tummy Treat Orders" }),
                            _jsx("div", { className: "text-xl font-black text-gray-900 mt-0.5", children: tummyTreatOrders.length })
                          ]
                        }),
                        _jsxs("div", {
                          className: "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs col-span-2 sm:col-span-1",
                          children: [
                            _jsx("div", { className: "text-[10px] uppercase font-bold text-gray-400 tracking-wider", children: "Delivered Sales" }),
                            _jsxs("div", { className: "text-xl font-black text-emerald-600 mt-0.5", children: [
                              "₹",
                              tummyTreatOrders
                                .filter(o => o.status === 'delivered')
                                .reduce((acc, o) => acc + Number(o.grandTotal || o.grand_total || 0), 0)
                                .toFixed(0)
                            ] })
                          ]
                        })
                      ]
                    }),

                    // Search and Filter controls
                    _jsxs("div", {
                      className: "space-y-2.5",
                      children: [
                        _jsxs("div", {
                          className: "relative",
                          children: [
                            _jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-2.5" }),
                            _jsx("input", {
                              type: "text",
                              value: orderSearchQuery,
                              onChange: e => setOrderSearchQuery(e.target.value),
                              placeholder: "Search orders by customer, room, phone, or #ID...",
                              className: "w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-orange-500 shadow-xs"
                            })
                          ]
                        }),
                        _jsx("div", {
                          className: "flex gap-1.5 overflow-x-auto no-scrollbar pb-1",
                          children: [
                            { id: 'all', label: 'All Orders' },
                            { id: 'active', label: `⚡ Active (${activeOrdersCount})` },
                            { id: 'placed', label: 'Placed' },
                            { id: 'preparing', label: 'Preparing' },
                            { id: 'out_for_delivery', label: 'Out for Delivery' },
                            { id: 'delivered', label: 'Delivered' },
                            { id: 'cancelled', label: 'Cancelled' }
                          ].map(pill =>
                            _jsx("button", {
                              onClick: () => setOrderStatusFilter(pill.id),
                              className: `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                orderStatusFilter === pill.id
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-orange-50'
                              }`,
                              children: pill.label
                            }, pill.id)
                          )
                        })
                      ]
                    }),

                    // Orders List
                    ordersLoading ? (
                      _jsxs("div", {
                        className: "bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2",
                        children: [
                          _jsx("div", { className: "w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" }),
                          _jsx("p", { className: "text-xs font-bold text-gray-500", children: "Connecting to live order stream..." })
                        ]
                      })
                    ) : displayedOrders.length === 0 ? (
                      _jsxs("div", {
                        className: "bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2",
                        children: [
                          _jsx("div", { className: "w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto", children: _jsx(ShoppingBag, { className: "w-6 h-6" }) }),
                          _jsx("div", { className: "text-xs font-bold text-gray-700", children: orderSearchQuery ? 'No orders match your search' : `No ${orderStatusFilter === 'all' ? '' : orderStatusFilter} orders found` }),
                          _jsx("p", { className: "text-[11px] text-gray-400", children: "When customers order from Tummy Treat, orders appear here live with student hostel and room details." })
                        ]
                      })
                    ) : (
                      _jsx("div", {
                        className: "space-y-3",
                        children: displayedOrders.map(order => {
                          const grandTotal = Number(order['grand Total'] ?? order.grand_total ?? order.grandTotal ?? 0);
                          const itemsList = Array.isArray(order.items) ? order.items : [];
                          const customerName = order.name || 'Student';
                          const roomNumber = order.roomNo || order['room No.'] || order.room_no || 'N/A';
                          const hostelName = order.hostel || order.Hostel || 'Hostel';
                          const contactPhone = order.contact || order.customerPhone || '';
                          const cleanPhone = contactPhone.replace(/\D/g, '');
                          const orderNum = order.orderNumber || (order.id && String(order.id).startsWith('#') ? order.id : `#TT-${String(order.id || '').slice(-5)}`);

                          const isDelivered = order.status === 'delivered';
                          const isCancelled = order.status === 'cancelled';
                          const isPlaced = order.status === 'placed';
                          const isPreparing = order.status === 'confirmed' || order.status === 'cooking' || order.status === 'preparing';
                          const isOut = order.status === 'out_for_delivery';

                          return (
                            _jsxs("div", {
                              className: "bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3",
                              children: [
                                // Order Header
                                _jsxs("div", {
                                  className: "flex justify-between items-start gap-2",
                                  children: [
                                    _jsxs("div", {
                                      children: [
                                        _jsxs("div", { className: "font-extrabold text-sm text-gray-900 flex items-center gap-2", children: [
                                          _jsx("span", { children: orderNum }),
                                          _jsxs("span", { className: "text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100", children: [
                                            "₹", grandTotal.toFixed(0)
                                          ] })
                                        ] }),
                                        _jsxs("div", { className: "text-[10px] text-gray-400 mt-0.5", children: [
                                          formatOrderDate(order)
                                        ] })
                                      ]
                                    }),
                                    _jsx("span", {
                                      className: `px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isDelivered
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : isCancelled
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                      }`,
                                      children: (order.status || 'placed').replace(/_/g, ' ')
                                    })
                                  ]
                                }),

                                // Customer Delivery Details
                                _jsxs("div", {
                                  className: "grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-orange-50/40 rounded-2xl border border-orange-100/70 text-xs",
                                  children: [
                                    _jsxs("div", {
                                      className: "flex items-center space-x-2 min-w-0",
                                      children: [
                                        _jsx("div", { className: "w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0", children: _jsx(User, { className: "w-3.5 h-3.5" }) }),
                                        _jsxs("div", {
                                          className: "min-w-0",
                                          children: [
                                            _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Customer" }),
                                            _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", children: customerName })
                                          ]
                                        })
                                      ]
                                    }),
                                    _jsxs("div", {
                                      className: "flex items-center space-x-2 min-w-0",
                                      children: [
                                        _jsx("div", { className: "w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0", children: _jsx(Home, { className: "w-3.5 h-3.5" }) }),
                                        _jsxs("div", {
                                          className: "min-w-0",
                                          children: [
                                            _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Room No." }),
                                            _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", children: roomNumber })
                                          ]
                                        })
                                      ]
                                    }),
                                    _jsxs("div", {
                                      className: "flex items-center space-x-2 min-w-0",
                                      children: [
                                        _jsx("div", { className: "w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0", children: _jsx(Building, { className: "w-3.5 h-3.5" }) }),
                                        _jsxs("div", {
                                          className: "min-w-0",
                                          children: [
                                            _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Hostel" }),
                                            _jsx("div", { className: "font-extrabold text-gray-900 truncate text-[11px]", children: hostelName })
                                          ]
                                        })
                                      ]
                                    }),
                                    _jsxs("div", {
                                      className: "flex items-center space-x-2 min-w-0",
                                      children: [
                                        _jsx("div", { className: "w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0", children: _jsx(Phone, { className: "w-3.5 h-3.5" }) }),
                                        _jsxs("div", {
                                          className: "min-w-0 flex-1",
                                          children: [
                                            _jsx("div", { className: "text-[9px] uppercase font-bold text-gray-400 tracking-wider", children: "Phone" }),
                                            _jsxs("div", {
                                              className: "flex items-center space-x-1",
                                              children: [
                                                contactPhone ? _jsx("a", { href: `tel:${contactPhone}`, className: "font-extrabold text-gray-900 hover:text-orange-600 truncate text-[11px]", children: contactPhone }) : _jsx("span", { className: "font-extrabold text-gray-400 text-[11px]", children: "N/A" }),
                                                cleanPhone && _jsx("a", {
                                                  href: `https://wa.me/91${cleanPhone}`,
                                                  target: "_blank",
                                                  rel: "noreferrer",
                                                  className: "p-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded shrink-0",
                                                  title: "WhatsApp Student",
                                                  children: _jsx(MessageSquare, { className: "w-3 h-3" })
                                                })
                                              ]
                                            })
                                          ]
                                        })
                                      ]
                                    })
                                  ]
                                }),

                                // Items in order
                                _jsx("div", {
                                  className: "divide-y divide-gray-100 bg-gray-50/50 rounded-xl p-2.5",
                                  children: itemsList.map((item, idx) => (
                                    _jsxs("div", {
                                      className: "py-1.5 flex items-center justify-between text-xs",
                                      children: [
                                        _jsxs("div", {
                                          className: "flex items-center gap-2",
                                          children: [
                                            _jsx("span", { className: "font-black text-orange-600", children: `${item.quantity || 1}x` }),
                                            _jsxs("span", { className: "font-bold text-gray-800", children: [
                                              item.name,
                                              item.selectedOption ? ` (${item.selectedOption})` : ''
                                            ] })
                                          ]
                                        }),
                                        _jsxs("span", { className: "font-semibold text-gray-600", children: [
                                          "₹", (Number(item.price || 0) * (item.quantity || 1)).toFixed(0)
                                        ] })
                                      ]
                                    }, idx)
                                  ))
                                }),

                                // Status Action Buttons
                                !isDelivered && !isCancelled && _jsxs("div", {
                                  className: "flex items-center gap-2 pt-1",
                                  children: [
                                    isPlaced && _jsxs("button", {
                                      onClick: () => handleUpdateOrderStatus(order.id, 'cooking'),
                                      className: "flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5",
                                      children: [_jsx(Utensils, { className: "w-3.5 h-3.5" }), "Start Preparing"]
                                    }),
                                    isPreparing && _jsxs("button", {
                                      onClick: () => handleUpdateOrderStatus(order.id, 'out_for_delivery'),
                                      className: "flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5",
                                      children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5" }), "Mark Out for Delivery"]
                                    }),
                                    isOut && _jsxs("button", {
                                      onClick: () => handleUpdateOrderStatus(order.id, 'delivered'),
                                      className: "flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5",
                                      children: [_jsx(Check, { className: "w-3.5 h-3.5" }), "Mark Delivered"]
                                    }),
                                    _jsx("button", {
                                      onClick: () => {
                                        if (confirm(`Cancel order ${orderNum}?`)) {
                                          handleUpdateOrderStatus(order.id, 'cancelled');
                                        }
                                      },
                                      className: "px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                      children: "Cancel"
                                    })
                                  ]
                                })
                              ]
                            }, order.id)
                          );
                        })
                      })
                    )
                  ]
                }),

                // ═══ STORE STATUS TAB ═══
                activeTab === 'status' && store && _jsxs("div", {
                  className: "space-y-4",
                  children: [
                    // Live Status Card
                    _jsxs("div", {
                      className: `p-5 rounded-2xl border shadow-xs ${status?.isOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`,
                      children: [
                        _jsxs("div", {
                          className: "flex items-center gap-3 mb-3",
                          children: [
                            _jsx("div", {
                              className: `w-4 h-4 rounded-full ${status?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`,
                            }),
                            _jsx("h2", {
                              className: `text-lg font-black ${status?.isOpen ? 'text-emerald-800' : 'text-rose-800'}`,
                              children: status?.isOpen ? 'Store is OPEN' : 'Store is CLOSED'
                            })
                          ]
                        }),
                        _jsx("p", {
                          className: `text-sm font-medium ${status?.isOpen ? 'text-emerald-700' : 'text-rose-700'}`,
                          children: status?.message
                        }),
                        timings && _jsxs("p", {
                          className: "text-xs text-gray-500 mt-2 flex items-center gap-1",
                          children: [_jsx(Clock, { className: "w-3 h-3" }), "Current Schedule: ", timings.timingLabel]
                        })
                      ]
                    }),

                    // Store Operating Hours (Store Timings Control)
                    _jsxs("form", {
                      onSubmit: handleSaveTimings,
                      className: "bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4",
                      children: [
                        _jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [
                            _jsxs("h3", {
                              className: "font-extrabold text-sm text-gray-900 flex items-center gap-2",
                              children: [_jsx(Clock, { className: "w-4 h-4 text-orange-500" }), "Store Operating Hours"]
                            }),
                            _jsxs("span", {
                              className: "text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100",
                              children: [formatTimeTo12Hour(storeOpenTime, '11:00 AM'), " – ", formatTimeTo12Hour(storeCloseTime, '10:00 PM')]
                            })
                          ]
                        }),
                        _jsx("p", {
                          className: "text-xs text-gray-500",
                          children: "Set the daily opening and closing hours for your store. When your store is set to AUTO schedule, it will automatically open and close at these times."
                        }),
                        _jsxs("div", {
                          className: "grid grid-cols-2 gap-3",
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("label", { className: "block text-xs font-bold text-gray-700 mb-1", children: "Opening Time" }),
                                _jsx("input", {
                                  type: "time",
                                  required: true,
                                  value: storeOpenTime,
                                  onChange: (e) => setStoreOpenTime(e.target.value),
                                  className: "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                                }),
                                _jsxs("span", {
                                  className: "text-[10px] text-gray-400 mt-1 block font-medium",
                                  children: ["Opens: ", _jsx("strong", { className: "text-gray-700", children: formatTimeTo12Hour(storeOpenTime, '11:00 AM') })]
                                })
                              ]
                            }),
                            _jsxs("div", {
                              children: [
                                _jsx("label", { className: "block text-xs font-bold text-gray-700 mb-1", children: "Closing Time" }),
                                _jsx("input", {
                                  type: "time",
                                  required: true,
                                  value: storeCloseTime,
                                  onChange: (e) => setStoreCloseTime(e.target.value),
                                  className: "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                                }),
                                _jsxs("span", {
                                  className: "text-[10px] text-gray-400 mt-1 block font-medium",
                                  children: ["Closes: ", _jsx("strong", { className: "text-gray-700", children: formatTimeTo12Hour(storeCloseTime, '10:00 PM') })]
                                })
                              ]
                            })
                          ]
                        }),
                        _jsx("button", {
                          type: "submit",
                          disabled: isSavingTimings,
                          className: "w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                          children: isSavingTimings
                            ? [_jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }), "Saving..."]
                            : [_jsx(Check, { className: "w-3.5 h-3.5" }), "Save Operating Hours"]
                        })
                      ]
                    }),

                    // Store Photo & Banner Upload Card
                    _jsxs("div", {
                      className: "bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-3",
                      children: [
                        _jsxs("h3", {
                          className: "font-extrabold text-sm text-gray-900 flex items-center gap-2",
                          children: [_jsx(Camera, { className: "w-4 h-4 text-orange-500" }), "Store Photo & Banner"]
                        }),
                        _jsx("p", {
                          className: "text-xs text-gray-500",
                          children: "Upload a photo from your gallery to display on your store profile and card on FoodZa."
                        }),
                        _jsxs("div", {
                          className: "flex items-center gap-3 pt-1",
                          children: [
                            store?.image
                              ? _jsx("img", { src: store.image, alt: "Store Photo", className: "w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0" })
                              : _jsx("div", { className: "w-14 h-14 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-400 shrink-0", children: _jsx(Store, { className: "w-7 h-7" }) }),
                            _jsxs("div", {
                              className: "flex-1 space-y-1.5",
                              children: [
                                _jsxs("label", {
                                  className: "inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold cursor-pointer border border-orange-200 transition-colors",
                                  children: [
                                    _jsx(Upload, { className: "w-3.5 h-3.5" }),
                                    "Choose from Gallery",
                                    _jsx("input", {
                                      type: "file",
                                      accept: "image/*",
                                      className: "hidden",
                                      onChange: handleStorePhotoUpload
                                    })
                                  ]
                                }),
                                store?.image && _jsxs("button", {
                                  type: "button",
                                  onClick: handleRemoveStorePhoto,
                                  className: "block text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer",
                                  children: ["Remove photo"]
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    }),

                    // Open / Close / Auto Controls
                    _jsxs("div", {
                      className: "bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-4",
                      children: [
                        _jsxs("h3", {
                          className: "font-extrabold text-sm text-gray-900 flex items-center gap-2",
                          children: [_jsx(Power, { className: "w-4 h-4 text-orange-500" }), "Store Controls"]
                        }),
                        _jsxs("div", {
                          className: "grid grid-cols-3 gap-2",
                          children: [
                            _jsxs("button", {
                              onClick: () => handleToggleStoreStatus('open'),
                              className: `flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                manualSetting === 'open'
                                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                              }`,
                              children: [
                                _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${manualSetting === 'open' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`, children: _jsx(Check, { className: "w-4 h-4" }) }),
                                _jsx("span", { className: `text-xs font-extrabold ${manualSetting === 'open' ? 'text-emerald-700' : 'text-gray-600'}`, children: "OPEN" }),
                                _jsx("span", { className: "text-[10px] text-gray-400 font-medium", children: "Force open" })
                              ]
                            }),
                            _jsxs("button", {
                              onClick: () => handleToggleStoreStatus('closed'),
                              className: `flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                manualSetting === 'closed'
                                  ? 'border-rose-500 bg-rose-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/50'
                              }`,
                              children: [
                                _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${manualSetting === 'closed' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`, children: _jsx(XCircle, { className: "w-4 h-4" }) }),
                                _jsx("span", { className: `text-xs font-extrabold ${manualSetting === 'closed' ? 'text-rose-700' : 'text-gray-600'}`, children: "CLOSED" }),
                                _jsx("span", { className: "text-[10px] text-gray-400 font-medium", children: "Force close" })
                              ]
                            }),
                            _jsxs("button", {
                              onClick: () => handleToggleStoreStatus('auto'),
                              className: `flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                manualSetting === 'auto'
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                              }`,
                              children: [
                                _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${manualSetting === 'auto' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`, children: _jsx(Clock, { className: "w-4 h-4" }) }),
                                _jsx("span", { className: `text-xs font-extrabold ${manualSetting === 'auto' ? 'text-blue-700' : 'text-gray-600'}`, children: "AUTO" }),
                                _jsx("span", { className: "text-[10px] text-gray-400 font-medium", children: "By schedule" })
                              ]
                            })
                          ]
                        })
                      ]
                    }),

                    // Website Visibility
                    _jsxs("div", {
                      className: "bg-white p-5 rounded-2xl shadow-xs border border-gray-100 space-y-3",
                      children: [
                        _jsxs("h3", {
                          className: "font-extrabold text-sm text-gray-900 flex items-center gap-2",
                          children: [store.isVisible !== false ? _jsx(Eye, { className: "w-4 h-4 text-emerald-500" }) : _jsx(EyeOff, { className: "w-4 h-4 text-rose-500" }), "Website Visibility"]
                        }),
                        _jsx("p", {
                          className: "text-xs text-gray-500",
                          children: store.isVisible !== false
                            ? "Your store is currently VISIBLE to customers on FoodZa."
                            : "Your store is currently HIDDEN from customers on FoodZa."
                        }),
                        _jsxs("button", {
                          onClick: handleToggleVisibility,
                          className: `w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer ${
                            store.isVisible !== false
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                          }`,
                          children: [
                            store.isVisible !== false ? _jsx(EyeOff, { className: "w-4 h-4 inline mr-2" }) : _jsx(Eye, { className: "w-4 h-4 inline mr-2" }),
                            store.isVisible !== false ? 'Hide Store from Website' : 'Make Store Visible on Website'
                          ]
                        })
                      ]
                    }),

                    // Store Stats
                    _jsxs("div", {
                      className: "grid grid-cols-2 gap-3",
                      children: [
                        _jsxs("div", {
                          className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 text-center",
                          children: [
                            _jsx("div", { className: "text-2xl font-black text-orange-600", children: store.items?.length || 0 }),
                            _jsx("div", { className: "text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1", children: "Menu Items" })
                          ]
                        }),
                        _jsxs("div", {
                          className: "bg-white p-4 rounded-2xl shadow-xs border border-gray-100 text-center",
                          children: [
                            _jsx("div", { className: "text-2xl font-black text-amber-600", children: menuCategories.filter(c => c !== 'All').length }),
                            _jsx("div", { className: "text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1", children: "Categories" })
                          ]
                        })
                      ]
                    })
                  ]
                }),

                // ═══ MENU TAB ═══
                activeTab === 'menu' && store && _jsxs("div", {
                  className: "space-y-4",
                  children: [
                    // Header + Add Button
                    _jsxs("div", {
                      className: "flex justify-between items-center",
                      children: [
                        _jsxs("div", {
                          children: [
                            _jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Menu Items" }),
                            _jsxs("p", { className: "text-xs text-gray-500 mt-0.5", children: [store.items?.length || 0, " items in your menu"] })
                          ]
                        }),
                        _jsxs("button", {
                          onClick: () => {
                            setIsAddingItem(true);
                            setEditingItem(null);
                            setItemForm({ name: '', price: 99, description: '', image: '', category: store.menuCategories?.[0] || 'Fries & Snacks', isVeg: true, isBestseller: false });
                          },
                          className: "flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer",
                          children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "Add Item"]
                        })
                      ]
                    }),

                    // Search + Category Filter
                    _jsxs("div", {
                      className: "space-y-2.5",
                      children: [
                        _jsxs("div", {
                          className: "relative",
                          children: [
                            _jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-2.5" }),
                            _jsx("input", {
                              type: "text",
                              value: menuSearchQuery,
                              onChange: e => setMenuSearchQuery(e.target.value),
                              placeholder: "Search menu items...",
                              className: "w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-orange-500 shadow-xs"
                            })
                          ]
                        }),
                        _jsx("div", {
                          className: "flex gap-1.5 overflow-x-auto no-scrollbar pb-1",
                          children: allCategories.map(cat =>
                            _jsx("button", {
                              onClick: () => setMenuCategoryFilter(cat),
                              className: `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                menuCategoryFilter === cat
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-orange-50'
                              }`,
                              children: cat
                            }, cat)
                          )
                        })
                      ]
                    }),

                    // Add / Edit Form
                    (isAddingItem || editingItem) && _jsxs("form", {
                      onSubmit: handleSaveItem,
                      className: "bg-white p-4 rounded-2xl border border-orange-200 space-y-3 shadow-xs",
                      children: [
                        _jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [
                            _jsx("h4", { className: "font-extrabold text-xs text-gray-800 uppercase tracking-wider", children: isAddingItem ? '➕ Add New Item' : '✏️ Edit Item' }),
                            _jsx("button", {
                              type: "button",
                              onClick: () => { setIsAddingItem(false); setEditingItem(null); },
                              className: "text-gray-400 hover:text-gray-600 cursor-pointer",
                              children: _jsx(XCircle, { className: "w-5 h-5" })
                            })
                          ]
                        }),
                        _jsxs("div", {
                          className: "space-y-2.5 text-xs",
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("label", { className: "block font-bold mb-1", children: "Item Name" }),
                                _jsx("input", {
                                  type: "text",
                                  required: true,
                                  value: itemForm.name,
                                  onChange: e => setItemForm({ ...itemForm, name: e.target.value }),
                                  className: "w-full p-2 border border-gray-200 rounded-xl",
                                  placeholder: "e.g. Chicken Shawarma Roll"
                                })
                              ]
                            }),
                            _jsxs("div", {
                              className: "grid grid-cols-2 gap-2",
                              children: [
                                _jsxs("div", {
                                  children: [
                                    _jsx("label", { className: "block font-bold mb-1", children: "Price (₹)" }),
                                    _jsx("input", {
                                      type: "number",
                                      required: true,
                                      min: "0",
                                      value: itemForm.price,
                                      onChange: e => setItemForm({ ...itemForm, price: e.target.value }),
                                      className: "w-full p-2 border border-gray-200 rounded-xl"
                                    })
                                  ]
                                }),
                                _jsxs("div", {
                                  children: [
                                    _jsx("label", { className: "block font-bold mb-1", children: "Category" }),
                                    _jsx("select", {
                                      value: itemForm.category,
                                      onChange: e => setItemForm({ ...itemForm, category: e.target.value }),
                                      className: "w-full p-2 border border-gray-200 rounded-xl bg-white",
                                      children: menuCategories.filter(c => c !== 'All').map(c =>
                                        _jsx("option", { value: c, children: c }, c)
                                      )
                                    })
                                  ]
                                })
                              ]
                            }),
                            _jsxs("div", {
                              children: [
                                _jsx("label", { className: "block font-bold mb-1", children: "Description" }),
                                _jsx("textarea", {
                                  value: itemForm.description,
                                  onChange: e => setItemForm({ ...itemForm, description: e.target.value }),
                                  className: "w-full p-2 border border-gray-200 rounded-xl",
                                  rows: 2,
                                  placeholder: "Delicious ingredients, serving size..."
                                })
                              ]
                            }),
                            _jsxs("div", {
                              className: "flex items-center gap-4 pt-1",
                              children: [
                                _jsxs("label", {
                                  className: "flex items-center gap-2 cursor-pointer font-bold",
                                  children: [
                                    _jsx("input", {
                                      type: "checkbox",
                                      checked: itemForm.isVeg,
                                      onChange: e => setItemForm({ ...itemForm, isVeg: e.target.checked }),
                                      className: "w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                    }),
                                    _jsx("span", { children: "Vegetarian" })
                                  ]
                                }),
                                _jsxs("label", {
                                  className: "flex items-center gap-2 cursor-pointer font-bold",
                                  children: [
                                    _jsx("input", {
                                      type: "checkbox",
                                      checked: itemForm.isBestseller,
                                      onChange: e => setItemForm({ ...itemForm, isBestseller: e.target.checked }),
                                      className: "w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                                    }),
                                    _jsx("span", { children: "Bestseller" })
                                  ]
                                })
                              ]
                            })
                          ]
                        }),
                        _jsx("button", {
                          type: "submit",
                          className: "w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer",
                          children: isAddingItem ? "Add to Menu" : "Update Item"
                        })
                      ]
                    }),

                    // Item List
                    filteredItems.length === 0 ? (
                      _jsxs("div", {
                        className: "bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2",
                        children: [
                          _jsx("div", { className: "w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto", children: _jsx(Utensils, { className: "w-5 h-5" }) }),
                          _jsx("p", { className: "text-xs font-bold text-gray-500", children: "No menu items found" })
                        ]
                      })
                    ) : (
                      _jsx("div", {
                        className: "space-y-2",
                        children: filteredItems.map(item =>
                          _jsxs("div", {
                            className: "bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-orange-100 transition-colors",
                            children: [
                              _jsxs("div", {
                                className: "flex-1 min-w-0 space-y-0.5",
                                children: [
                                  _jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                      _jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${item.isVeg !== false ? 'bg-emerald-500' : 'bg-rose-500'}` }),
                                      _jsx("span", { className: "font-bold text-xs text-gray-900 truncate", children: item.name }),
                                      item.isBestseller && _jsx("span", { className: "px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md shrink-0", children: "★ BESTSELLER" })
                                    ]
                                  }),
                                  _jsxs("div", {
                                    className: "text-[11px] text-gray-500 font-medium flex items-center gap-2",
                                    children: [
                                      _jsxs("span", { className: "font-black text-gray-900", children: ["₹", item.price] }),
                                      _jsx("span", { className: "text-gray-300", children: "•" }),
                                      _jsx("span", { className: "text-orange-600 font-bold", children: item.category })
                                    ]
                                  }),
                                  item.description && _jsx("p", {
                                    className: "text-[10px] text-gray-400 truncate max-w-sm",
                                    children: item.description
                                  })
                                ]
                              }),
                              _jsxs("div", {
                                className: "flex items-center gap-1 shrink-0",
                                children: [
                                  _jsx("button", {
                                    onClick: () => startEditItem(item),
                                    className: "p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer",
                                    title: "Edit item",
                                    children: _jsx(Edit3, { className: "w-3.5 h-3.5" })
                                  }),
                                  _jsx("button", {
                                    onClick: () => handleDeleteItem(item.id),
                                    className: "p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer",
                                    title: "Delete item",
                                    children: _jsx(Trash2, { className: "w-3.5 h-3.5" })
                                  })
                                ]
                              })
                            ]
                          }, item.id)
                        )
                      })
                    )
                  ]
                }),

                // ═══ CATEGORIES TAB ═══
                activeTab === 'categories' && store && _jsxs("div", {
                  className: "space-y-4",
                  children: [
                    _jsxs("div", {
                      children: [
                        _jsx("h3", { className: "font-extrabold text-sm text-gray-900", children: "Manage Categories" }),
                        _jsxs("p", { className: "text-xs text-gray-500 mt-0.5", children: [
                          menuCategories.filter(c => c !== 'All').length, " categories in your store"
                        ] })
                      ]
                    }),
                    _jsxs("form", {
                      onSubmit: handleAddCategory,
                      className: "bg-white p-4 rounded-2xl border border-orange-200 shadow-xs space-y-3",
                      children: [
                        _jsxs("h4", {
                          className: "font-extrabold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5",
                          children: [_jsx(FolderPlus, { className: "w-3.5 h-3.5 text-orange-500" }), "Add New Category"]
                        }),
                        _jsxs("div", {
                          className: "flex gap-2",
                          children: [
                            _jsx("input", {
                              type: "text",
                              value: newCategoryName,
                              onChange: e => setNewCategoryName(e.target.value),
                              placeholder: "e.g. Starters, Main Course, Beverages",
                              className: "flex-1 p-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:border-orange-500 focus:outline-none",
                              required: true
                            }),
                            _jsxs("button", {
                              type: "submit",
                              disabled: !newCategoryName.trim(),
                              className: "flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-xs shrink-0 cursor-pointer",
                              children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "Add"]
                            })
                          ]
                        })
                      ]
                    }),
                    menuCategories.filter(c => c !== 'All').length === 0
                      ? _jsx("div", {
                          className: "text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200",
                          children: _jsxs("div", {
                            className: "space-y-2",
                            children: [
                              _jsx(Tag, { className: "w-8 h-8 text-gray-300 mx-auto" }),
                              _jsx("p", { className: "text-sm font-bold text-gray-400", children: "No categories yet" })
                            ]
                          })
                        })
                      : _jsx("div", {
                          className: "space-y-2",
                          children: menuCategories.filter(c => c !== 'All').map(cat => {
                            const itemCount = (store.items || []).filter(i => i.category === cat).length;
                            return _jsxs("div", {
                              className: "bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-orange-100 transition-colors",
                              children: [
                                _jsxs("div", {
                                  className: "flex items-center gap-3 flex-1 min-w-0",
                                  children: [
                                    _jsx("div", {
                                      className: "w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0",
                                      children: _jsx(Tag, { className: "w-4 h-4 text-orange-500" })
                                    }),
                                    _jsxs("div", {
                                      className: "min-w-0",
                                      children: [
                                        _jsx("p", { className: "font-bold text-xs text-gray-900 truncate", children: cat }),
                                        _jsxs("p", { className: "text-[10px] text-gray-400 font-medium mt-0.5", children: [
                                          itemCount, " item", itemCount !== 1 ? 's' : ''
                                        ] })
                                      ]
                                    })
                                  ]
                                }),
                                _jsx("button", {
                                  onClick: () => handleDeleteCategory(cat),
                                  className: "p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer",
                                  title: `Delete ${cat}`,
                                  children: _jsx(Trash2, { className: "w-3.5 h-3.5" })
                                })
                              ]
                            }, cat);
                          })
                        })
                  ]
                }),

                // Loading fallback
                isLoading && !store && _jsx("div", {
                  className: "text-center py-16",
                  children: _jsxs("div", {
                    className: "inline-flex flex-col items-center gap-3",
                    children: [
                      _jsx("div", { className: "w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" }),
                      _jsx("p", { className: "text-xs font-bold text-gray-500", children: "Loading store data..." })
                    ]
                  })
                }),

                // Store not found
                !isLoading && !store && _jsxs("div", {
                  className: "text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200",
                  children: [
                    _jsx("p", { className: "text-sm font-bold text-gray-500", children: "Tummy Treat store not found in database" }),
                    _jsx("button", { onClick: loadStores, className: "mt-3 text-xs font-bold text-orange-600 hover:underline cursor-pointer", children: "Retry" })
                  ]
                })
              ]
            })
          })
        ]
      })
    })
  );
}
