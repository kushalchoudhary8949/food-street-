import React, { useState, useMemo } from 'react';
import { getOrderWindowStatus, isOrderWindowOpen } from './utils/orderTiming';
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
import { sendOrderToWhatsApp } from './utils/whatsapp';

import { CATEGORIES, STORES, INITIAL_ADDRESSES, INITIAL_ORDERS, DATA_VERSION } from './data/mockData';
import {
  ActiveTab,
  CartItem,
  Category,
  MenuItem,
  MenuItemAddon,
  Order,
  OrderStatus,
  Store,
  UserAddress,
} from './types';

const ADDRESS_STORAGE_KEY = 'food_street_addresses';
const CURRENT_ADDRESS_STORAGE_KEY = 'food_street_current_address';

export default function App() {
  // Load initial states from localStorage if available (invalidates on data version mismatch)
  const [stores, setStores] = useState<Store[]>(() => {
    const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('food_street_version') : null;
    if (savedVersion !== DATA_VERSION) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('food_street_version', DATA_VERSION);
        localStorage.setItem('food_street_stores', JSON.stringify(STORES));
        localStorage.setItem('food_street_categories', JSON.stringify(CATEGORIES));
      }
      return STORES;
    }
    const saved = localStorage.getItem('food_street_stores');
    return saved ? JSON.parse(saved) : STORES;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('food_street_version') : null;
    if (savedVersion !== DATA_VERSION) {
      return CATEGORIES;
    }
    const saved = localStorage.getItem('food_street_categories');
    return saved ? JSON.parse(saved) : CATEGORIES;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('food_street_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  // Ensure fresh stores and categories are loaded when version changes
  React.useEffect(() => {
    const savedVersion = localStorage.getItem('food_street_version');
    if (savedVersion !== DATA_VERSION) {
      localStorage.setItem('food_street_version', DATA_VERSION);
      localStorage.setItem('food_street_stores', JSON.stringify(STORES));
      localStorage.setItem('food_street_categories', JSON.stringify(CATEGORIES));
      setStores(STORES);
      setCategories(CATEGORIES);
    }
  }, []);

  // Save states to localStorage when they change
  React.useEffect(() => {
    localStorage.setItem('food_street_stores', JSON.stringify(stores));
  }, [stores]);

  React.useEffect(() => {
    localStorage.setItem('food_street_categories', JSON.stringify(categories));
  }, [categories]);

  React.useEffect(() => {
    localStorage.setItem('food_street_orders', JSON.stringify(orders));
  }, [orders]);

  // Sync state across open tabs in real-time
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'food_street_stores' && e.newValue) {
        setStores(JSON.parse(e.newValue));
      }
      if (e.key === 'food_street_categories' && e.newValue) {
        setCategories(JSON.parse(e.newValue));
      }
      if (e.key === 'food_street_orders' && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
      if (e.key === ADDRESS_STORAGE_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          if (Array.isArray(next)) setAddresses(next);
        } catch {
          // ignore invalid data
        }
      }
      if (e.key === CURRENT_ADDRESS_STORAGE_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          if (next && next.id) setCurrentAddress(next);
        } catch {
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

  const isAdmin = 
    currentPath.startsWith('/admin') || 
    currentPath === '#/admin' || 
    window.location.search.includes('admin=true');

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem('admin_session_token') ||
      sessionStorage.getItem('admin_session_token')
    );
  });

  // App navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Address state
  const [addresses, setAddresses] = useState<UserAddress[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ADDRESSES;
    const saved = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!saved) return INITIAL_ADDRESSES;

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADDRESSES;
    } catch {
      return INITIAL_ADDRESSES;
    }
  });
  const [currentAddress, setCurrentAddress] = useState<UserAddress>(() => {
    if (typeof window === 'undefined') return INITIAL_ADDRESSES[0];

    const savedAddress = window.localStorage.getItem(CURRENT_ADDRESS_STORAGE_KEY);
    if (savedAddress) {
      try {
        const parsed = JSON.parse(savedAddress);
        if (parsed && parsed.id) return parsed;
      } catch {
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
  const [favorites, setFavorites] = useState<string[]>(['store-kfc', 'store-bbk']);

  // Selected store & modals
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Menu item customizer modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizingItemStore, setCustomizingItemStore] = useState<Store | null>(null);

  // Separate carts for each top-level store
  const [bzCartItems, setBzCartItems] = useState<CartItem[]>([]);
  const [fsCartItems, setFsCartItems] = useState<CartItem[]>([]);
  const [isBzCartOpen, setIsBzCartOpen] = useState(false);
  const [isFsCartOpen, setIsFsCartOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pending orders for multi-bill logic
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  // IDs that belong to The Food Street hub (parent + its outlets)
  const FOOD_STREET_IDS = new Set([
    'store-food-street',
    'store-kfc',
    'store-pizzahut',
    'store-vengo',
    'store-bbk',
    'store-goila',
    'store-baskinrobbins',
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle favorite store
  const handleToggleFavorite = (e?: React.MouseEvent, storeId?: string) => {
    if (e) e.stopPropagation();
    if (!storeId) return;

    if (favorites.includes(storeId)) {
      setFavorites(favorites.filter(id => id !== storeId));
      showToast('Removed from favorites');
    } else {
      setFavorites([...favorites, storeId]);
      showToast('Added to favorites');
    }
  };

  // Handle category select
  const handleSelectCategory = (catSlug: string | null) => {
    setSelectedCategory(catSlug);
  };

  // Open store details
  const handleOpenStore = (store: Store) => {
    setSelectedStore(store);
    setIsStoreModalOpen(true);
  };

  // Handle Add to Cart — routes to BZ cart or FS cart based on store
  const handleAddToCart = (
    item: MenuItem,
    quantity = 1,
    selectedAddons: MenuItemAddon[] = []
  ) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isDayRestricted = Array.isArray(item.availableOnDays) && item.availableOnDays.length > 0;
    if (isDayRestricted && !item.availableOnDays!.includes(today)) {
      showToast(`Only available on ${item.availableOnDays!.join(', ')}`);
      return;
    }

    // Determine exact store / outlet for this item
    let store = customizingItemStore || selectedStore;
    if (store && store.outlets) {
      const outletMatch = store.outlets.find((o) => o.id === item.storeId);
      if (outletMatch) store = outletMatch;
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
    if (!store) store = stores[0];

    const uniqueId = `${item.id}-${selectedAddons.map(a => a.id).sort().join('_')}`;
    const newCartItem: CartItem = { id: uniqueId, item, store: store!, quantity, selectedAddons };

    // Route to the correct cart
    const isFoodStreet = FOOD_STREET_IDS.has(store!.id);
    const setCart = isFoodStreet ? setFsCartItems : setBzCartItems;

    setCart((prev) => {
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
  const makeUpdateQuantity = (setCart: React.Dispatch<React.SetStateAction<CartItem[]>>) =>
    (cartItemIdOrItemId: string, delta: number) => {
      setCart((prev) => {
        const index = prev.findIndex(
          ci => ci.id === cartItemIdOrItemId || ci.item.id === cartItemIdOrItemId
        );
        if (index === -1) return prev;
        const current = prev[index];
        const newQty = current.quantity + delta;
        if (newQty <= 0) return prev.filter((_, idx) => idx !== index);
        const copy = [...prev];
        copy[index] = { ...current, quantity: newQty };
        return copy;
      });
    };

  const handleUpdateBzCartQuantity = makeUpdateQuantity(setBzCartItems);
  const handleUpdateFsCartQuantity = makeUpdateQuantity(setFsCartItems);

  // Also keep a generic one for StoreDetailModal (will route to the right cart based on store)
  const handleUpdateCartQuantity = (cartItemIdOrItemId: string, delta: number) => {
    // Try BZ cart first, then FS cart
    const inBz = bzCartItems.some(ci => ci.id === cartItemIdOrItemId || ci.item.id === cartItemIdOrItemId);
    if (inBz) {
      handleUpdateBzCartQuantity(cartItemIdOrItemId, delta);
    } else {
      handleUpdateFsCartQuantity(cartItemIdOrItemId, delta);
    }
  };

  // Generic place order — accepts the cart items for the specific store
  const buildAndPlaceOrder = (
    cartItemsForOrder: CartItem[],
    clearCart: () => void,
    closeCart: () => void,
    { tip, discount, couponCode, instructions, paymentMethod, cancellationConfirmed }: {
      tip: number;
      discount: number;
      couponCode: string;
      instructions: string;
      paymentMethod: string;
      cancellationConfirmed: boolean;
    },
    containerChargePerItem = 0
  ) => {
    if (cartItemsForOrder.length === 0) return;
    const windowStatus = getOrderWindowStatus();
    if (!windowStatus.isOpen) {
      showToast(windowStatus.message);
      return;
    }

    const itemTotal = cartItemsForOrder.reduce((sum, ci) => {
      const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
      return sum + (ci.item.price + addonsCost) * ci.quantity;
    }, 0);

    const totalQuantity = cartItemsForOrder.reduce((sum, ci) => sum + ci.quantity, 0);
    const containerCharge = containerChargePerItem > 0 ? totalQuantity * containerChargePerItem : 0;
    const taxesAndPacking = Number((itemTotal * 0.05).toFixed(2));
    const offerDiscount = cartItemsForOrder.some((ci) => ci.store.id === 'store-biriyani-zone')
      ? Number(((itemTotal + taxesAndPacking) * 0.10).toFixed(2))
      : 0;
    const deliveryFee = 20;
    const grandTotal = Math.max(0, itemTotal - offerDiscount + containerCharge + deliveryFee + taxesAndPacking + tip - discount);

    const storeMap = new Map<string, Store>();
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

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `#FD-${Math.floor(10000 + Math.random() * 90000)}`,
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

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    closeCart();
    setIsStoreModalOpen(false);
    sendOrderToWhatsApp(newOrder);
    setActiveTab('orders');
    showToast('🎉 Order placed & sent to WhatsApp (+91 8949508256)!');
  };

  const handlePlaceBzOrder = (opts: { tip: number; discount: number; couponCode: string; instructions: string; paymentMethod: string; cancellationConfirmed: boolean }) =>
    buildAndPlaceOrder(bzCartItems, () => setBzCartItems([]), () => setIsBzCartOpen(false), opts, 10);

  const handlePlaceFsOrder = (opts: { tip: number; discount: number; couponCode: string; instructions: string; paymentMethod: string; cancellationConfirmed: boolean }) =>
    buildAndPlaceOrder(fsCartItems, () => setFsCartItems([]), () => setIsFsCartOpen(false), opts);

  // Complete & remove order from list
  const handleCompleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    showToast('✅ Order completed & removed');
  };

  // Send pending (second) bill via WhatsApp
  const handleSendPendingOrder = (order: Order) => {
    sendOrderToWhatsApp(order);
    setPendingOrders(prev => prev.filter(o => o.id !== order.id));
    showToast('📩 Second bill sent via WhatsApp');
  };

  // Keywords mapping for robust category filtering
  const categoryKeywords = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = selectedCategory.toLowerCase();
    if (cat === 'rolls') return ['roll', 'wrap', 'kathi', 'frankie'];
    if (cat === 'healthy') return ['healthy', 'salad', 'diet', 'bowl', 'sprout', 'detox', 'quinoa', 'idli', 'upma', 'chaas', 'buttermilk'];
    if (cat === 'chicken') return ['chicken', 'wing', 'wings', 'tikka', 'kebab'];
    if (cat === 'desserts') return ['dessert', 'cake', 'lava', 'phirni', 'ice cream', 'sundae', 'kesari', 'sweet', 'shake'];
    if (cat === 'ice cream') return ['ice cream', 'sundae', 'scoop', 'tub', 'shake', 'baskin'];
    if (cat === 'south indian') return ['south indian', 'dosa', 'idli', 'vada', 'utthapam', 'upma', 'sambar', 'rasam', 'filter coffee', 'vaango'];
    if (cat === 'pizza') return ['pizza', 'breadstick', 'italian', 'crust'];
    if (cat === 'biryani') return ['biryani', 'dum', 'handi', 'rice'];
    if (cat === 'burgers') return ['burger', 'zinger', 'crispy'];
    return [cat];
  }, [selectedCategory]);

  // Filtered stores for Home screen
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      if (selectedCategory) {
        const matchesCat = categoryKeywords.some(kw => 
          store.cuisines.some(c => c.toLowerCase().includes(kw)) ||
          (store.tags && store.tags.some(t => t.toLowerCase().includes(kw))) ||
          store.name.toLowerCase().includes(kw) ||
          store.items.some(i => 
            i.category.toLowerCase().includes(kw) || 
            i.name.toLowerCase().includes(kw) ||
            (i.description && i.description.toLowerCase().includes(kw))
          )
        );
        if (!matchesCat) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = store.name.toLowerCase().includes(q);
        const matchCuisine = store.cuisines.some(c => c.toLowerCase().includes(q));
        const matchItem = store.items.some(i => i.name.toLowerCase().includes(q));
        if (!matchName && !matchCuisine && !matchItem) return false;
      }
      return true;
    });
  }, [selectedCategory, categoryKeywords, searchQuery, stores]);

  // Filtered dishes for currently selected category
  const categoryMatchedDishes = useMemo(() => {
    if (!selectedCategory) return [];
    const dishes: { item: MenuItem; store: Store }[] = [];
    
    stores.forEach((store) => {
      store.items.forEach((item) => {
        const isMatch = categoryKeywords.some(kw => 
          item.category.toLowerCase().includes(kw) ||
          item.name.toLowerCase().includes(kw) ||
          (item.description && item.description.toLowerCase().includes(kw)) ||
          store.cuisines.some(c => c.toLowerCase().includes(kw))
        );
        if (isMatch) {
          dishes.push({ item, store });
        }
      });
    });
    return dishes;
  }, [selectedCategory, categoryKeywords, stores]);

  // Calculate per-store cart counts/totals
  const bzCartCount = bzCartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const bzCartPrice = bzCartItems.reduce((acc, ci) => acc + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity, 0);
  const fsCartCount = fsCartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const fsCartPrice = fsCartItems.reduce((acc, ci) => acc + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity, 0);
  const totalCartCount = bzCartCount + fsCartCount;
  // Only track active orders among the customer's top 4 recent orders
  const activeOrdersCount = orders.slice(0, 4).filter(o => o.status !== 'delivered').length;

  // Combined cartItems for StoreDetailModal compatibility
  const cartItems = [...bzCartItems, ...fsCartItems];

  // Handlers to synchronize Admin updates to local state
  // Handlers to synchronize Admin updates to local state
  const handleUpdateStores = (newStores: Store[]) => {
    setStores(newStores);
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  const handleUpdateOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center text-gray-900 font-sans">
      {/* Mobile-contained wrapper max-w-md matching screenshot */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-white min-h-screen shadow-xl relative flex flex-col">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <span>{toastMessage}</span>
          </div>
        )}

        {isAdmin ? (
          isAdminAuthenticated ? (
            <div className="flex-1">
              <AdminTab
                stores={stores}
                categories={categories}
                orders={orders}
                onUpdateStores={handleUpdateStores}
                onUpdateCategories={handleUpdateCategories}
                onUpdateOrders={handleUpdateOrders}
                onLogout={() => {
                  localStorage.removeItem('admin_session_token');
                  sessionStorage.removeItem('admin_session_token');
                  setIsAdminAuthenticated(false);
                  showToast('🔒 Logged out of Admin Panel');
                }}
              />
            </div>
          ) : (
            <AdminLogin
              onLoginSuccess={() => {
                setIsAdminAuthenticated(true);
                showToast('🔓 Welcome to Admin Portal');
              }}
              onBackToStore={() => {
                window.location.hash = '';
                window.history.pushState(null, '', '/');
                setCurrentPath('/');
              }}
            />
          )
        ) : (
          <>
            {/* Tab-based view rendering */}
            {activeTab === 'home' && (
              <div className="flex-1 pb-24">
                {/* Header: Location & Profile Avatar & Search Bar */}
                <Header
                  currentAddress={currentAddress}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchFocus={() => {}}
                  onAvatarClick={() => setActiveTab('profile')}
                  onOpenCart={() => {
                    if (bzCartCount > 0) setIsBzCartOpen(true);
                    else if (fsCartCount > 0) setIsFsCartOpen(true);
                  }}
                  cartCount={totalCartCount}
                  cartTotal={bzCartPrice + fsCartPrice}
                />

                {/* Order Window Timing Banner */}
                {(() => {
                  const ws = getOrderWindowStatus();
                  return (
                    <div className={`mx-4 mt-3 flex items-center justify-between px-4 py-2.5 rounded-2xl font-semibold text-xs ${
                      ws.isOpen
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${ws.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span>{ws.isOpen ? 'Orders open now' : 'Orders currently closed'}</span>
                      </div>
                      <span className="opacity-70">⏰ {ws.opensAt} – {ws.closesAt}</span>
                    </div>
                  );
                })()}

                {/* Categories Carousel Row */}
                <div className="mt-1">
                  <CategoryBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                  />
                </div>

                {/* Category filter header (shown only when a category filter is active) */}
                {selectedCategory && (
                  <div className="px-4 mt-4 flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                      {selectedCategory.toUpperCase()} SPOTS
                    </h2>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                    >
                      Clear filter
                    </button>
                  </div>
                )}

                {/* Stores List */}
                <div className="px-4 mt-3 space-y-4">
                  {filteredStores.map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      isFavorite={favorites.includes(store.id)}
                      onToggleFavorite={(e) => handleToggleFavorite(e, store.id)}
                      onClick={() => handleOpenStore(store)}
                    />
                  ))}

                  {filteredStores.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <p className="text-sm font-bold text-gray-500">No restaurants match your search</p>
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setSearchQuery('');
                        }}
                        className="mt-2 text-xs font-bold text-red-600 hover:underline"
                      >
                        Reset all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="flex-1">
                <SearchTab
                  stores={stores}
                  initialQuery={searchQuery}
                  onSelectStore={handleOpenStore}
                  onSelectMenuItem={(item, store) => {
                    setCustomizingItemStore(store);
                    setCustomizingItem(item);
                  }}
                />
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="flex-1">
                <OrdersTab
                  orders={orders}
                  stores={stores}
                  pendingOrders={pendingOrders}
                  onCompleteOrder={handleCompleteOrder}
                  onExploreFood={() => setActiveTab('home')}
                  onSendPendingOrder={handleSendPendingOrder}
                />
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="flex-1">
                <ProfileTab
                  currentAddress={currentAddress}
                  addresses={addresses}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                  favoritesCount={favorites.length}
                  onViewFavorites={() => setActiveTab('home')}
                />
              </div>
            )}

            {/* Floating Cart Buttons — one per store */}
            {(bzCartCount > 0 || fsCartCount > 0) && activeTab !== 'orders' && !isStoreModalOpen && (
              <div className="fixed inset-x-0 bottom-18 z-30 flex justify-center px-4 animate-in slide-in-from-bottom duration-200">
                <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col gap-2">
                  {bzCartCount > 0 && (
                    <button
                      id="bz-floating-cart-btn"
                      onClick={() => setIsBzCartOpen(true)}
                      className="w-full min-h-[48px] py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-xl active:scale-98 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 leading-none">
                        <span className="inline-flex items-center justify-center h-6 px-2 bg-white/20 text-white text-[10px] font-black rounded-lg shrink-0">
                          {bzCartCount} {bzCartCount === 1 ? 'ITEM' : 'ITEMS'}
                        </span>
                        <span className="text-sm font-extrabold text-white leading-none">₹{bzCartPrice.toFixed(0)}</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">Biriyani Zone Cart →</span>
                    </button>
                  )}
                  {fsCartCount > 0 && (
                    <button
                      id="fs-floating-cart-btn"
                      onClick={() => setIsFsCartOpen(true)}
                      className="w-full min-h-[48px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-xl active:scale-98 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 leading-none">
                        <span className="inline-flex items-center justify-center h-6 px-2 bg-white/20 text-white text-[10px] font-black rounded-lg shrink-0">
                          {fsCartCount} {fsCartCount === 1 ? 'ITEM' : 'ITEMS'}
                        </span>
                        <span className="text-sm font-extrabold text-white leading-none">₹{fsCartPrice.toFixed(0)}</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">Food Street Cart →</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Navigation */}
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              activeOrdersCount={activeOrdersCount}
              cartItemsCount={totalCartCount}
              onOpenCart={() => {
                if (bzCartCount > 0) setIsBzCartOpen(true);
                else if (fsCartCount > 0) setIsFsCartOpen(true);
              }}
              showAdmin={false}
            />

            {/* Store Detail Fullscreen Modal */}
            <StoreDetailModal
              store={selectedStore}
              isOpen={isStoreModalOpen}
              onClose={() => setIsStoreModalOpen(false)}
              isFavorite={selectedStore ? favorites.includes(selectedStore.id) : false}
              onToggleFavorite={(storeId) => handleToggleFavorite(undefined, storeId)}
              cartItems={cartItems}
              onOpenItemModal={(item) => {
                setCustomizingItemStore(selectedStore);
                setCustomizingItem(item);
              }}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onOpenCart={() => {
                const isFoodStreet = selectedStore ? FOOD_STREET_IDS.has(selectedStore.id) : false;
                if (isFoodStreet) setIsFsCartOpen(true);
                else setIsBzCartOpen(true);
              }}
            />

            {/* Menu Item Customization Modal */}
            <MenuItemModal
              item={customizingItem}
              onClose={() => {
                setCustomizingItem(null);
                setCustomizingItemStore(null);
              }}
              onAddToCart={handleAddToCart}
            />

            {/* Biriyani Zone Cart Drawer */}
            <CartDrawer
              isOpen={isBzCartOpen}
              onClose={() => setIsBzCartOpen(false)}
              cartItems={bzCartItems}
              currentAddress={currentAddress}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              onUpdateQuantity={handleUpdateBzCartQuantity}
              onClearCart={() => setBzCartItems([])}
              containerChargePerItem={10}
              onPlaceOrder={handlePlaceBzOrder}
            />

            {/* The Food Street Cart Drawer */}
            <CartDrawer
              isOpen={isFsCartOpen}
              onClose={() => setIsFsCartOpen(false)}
              cartItems={fsCartItems}
              currentAddress={currentAddress}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              onUpdateQuantity={handleUpdateFsCartQuantity}
              onClearCart={() => setFsCartItems([])}
              onPlaceOrder={handlePlaceFsOrder}
            />

            {/* Location Picker Modal */}
            <LocationModal
              isOpen={isLocationModalOpen}
              onClose={() => setIsLocationModalOpen(false)}
              addresses={addresses}
              currentAddress={currentAddress}
              onSelectAddress={(addr) => setCurrentAddress(addr)}
              onAddAddress={(newAddr) => setAddresses((prev) => [newAddr, ...prev])}
              onDeleteAddress={(addressId) => {
                const remaining = addresses.filter(a => a.id !== addressId);
                if (remaining.length === 0) return;
                setAddresses(remaining);
                if (currentAddress.id === addressId) {
                  setCurrentAddress(remaining[0]);
                }
                showToast('Address removed');
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
