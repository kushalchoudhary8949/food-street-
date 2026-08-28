import React, { useState, useMemo } from 'react';
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
import { AdminTab } from './components/AdminTab';
import { AdminLogin } from './components/AdminLogin';
import { sendOrderToWhatsApp } from './utils/whatsapp';
import { 
  subscribeToOrders, 
  subscribeToStores, 
  subscribeToCategories, 
  saveOrderToFirestore, 
  saveStoresToFirestore,
  saveCategoriesToFirestore,
  deleteOrderFromFirestore,
  autoSeedFirestoreIfEmpty
} from './services/firebase';

import { CATEGORIES, STORES, INITIAL_ADDRESSES, INITIAL_ORDERS } from './data/mockData';
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

export default function App() {
  // Load initial states from localStorage if available
  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('food_street_stores');
    return saved ? JSON.parse(saved) : STORES;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('food_street_categories');
    return saved ? JSON.parse(saved) : CATEGORIES;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('food_street_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

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
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Real-time Firebase Cloud Database Listeners
  React.useEffect(() => {
    // Auto-seed initial stores & categories to cloud if DB is empty
    autoSeedFirestoreIfEmpty(STORES, CATEGORIES);

    const unsubOrders = subscribeToOrders((liveOrders) => {
      if (liveOrders && liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    });

    const unsubStores = subscribeToStores((liveStores) => {
      if (liveStores && liveStores.length > 0) {
        setStores(liveStores);
      }
    });

    const unsubCategories = subscribeToCategories((liveCategories) => {
      if (liveCategories && liveCategories.length > 0) {
        setCategories(liveCategories);
      }
    });

    return () => {
      unsubOrders();
      unsubStores();
      unsubCategories();
    };
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
  const [addresses, setAddresses] = useState<UserAddress[]>(INITIAL_ADDRESSES);
  const [currentAddress, setCurrentAddress] = useState<UserAddress>(INITIAL_ADDRESSES[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(['store-kfc', 'store-bbk']);

  // Selected store & modals
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Menu item customizer modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizingItemStore, setCustomizingItemStore] = useState<Store | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Handle Add to Cart from Store or Search (Multi-Store Support)
  const handleAddToCart = (
    item: MenuItem,
    quantity = 1,
    selectedAddons: MenuItemAddon[] = []
  ) => {
    const store = customizingItemStore || selectedStore || stores.find(s => s.id === item.storeId) || stores[0];

    const uniqueId = `${item.id}-${selectedAddons.map(a => a.id).sort().join('_')}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(ci => ci.id === uniqueId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            id: uniqueId,
            item,
            store,
            quantity,
            selectedAddons,
          },
        ];
      }
    });

    showToast(`Added ${quantity}x ${item.name} to cart`);
  };

  // Update Cart Quantity (+ / -)
  const handleUpdateCartQuantity = (cartItemIdOrItemId: string, delta: number) => {
    setCartItems((prev) => {
      // Find matching item either by unique cartItemId or basic item.id
      const index = prev.findIndex(
        ci => ci.id === cartItemIdOrItemId || ci.item.id === cartItemIdOrItemId
      );
      if (index === -1) return prev;

      const current = prev[index];
      const newQty = current.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      } else {
        const copy = [...prev];
        copy[index] = { ...current, quantity: newQty };
        return copy;
      }
    });
  };

  // Place order & Forward to WhatsApp
  const handlePlaceOrder = ({
    tip,
    discount,
    couponCode,
    instructions,
    paymentMethod,
  }: {
    tip: number;
    discount: number;
    couponCode: string;
    instructions: string;
    paymentMethod: string;
  }) => {
    if (cartItems.length === 0) return;

    const itemTotal = cartItems.reduce((sum, ci) => {
      const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
      return sum + (ci.item.price + addonsCost) * ci.quantity;
    }, 0);

    const deliveryFee = 15;
    const taxesAndPacking = Number((itemTotal * 0.05).toFixed(2));
    const grandTotal = Math.max(0, itemTotal + deliveryFee + taxesAndPacking + tip - discount);

    // Support multi-store order headers
    const storeMap = new Map<string, Store>();
    cartItems.forEach(ci => storeMap.set(ci.store.id, ci.store));
    const uniqueStores = Array.from(storeMap.values());
    const storeName = uniqueStores.length === 1 
      ? uniqueStores[0].name 
      : uniqueStores.map(s => s.name).join(' & ');
    const storeImage = uniqueStores[0].image;
    const storeId = uniqueStores.map(s => s.id).join('_');

    const formattedAddress = [
      currentAddress.roomNo ? `Room ${currentAddress.roomNo}` : null,
      currentAddress.hostelName,
      currentAddress.addressLine,
      currentAddress.locality,
      currentAddress.city,
    ].filter(Boolean).join(', ');

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `#FD-${Math.floor(10000 + Math.random() * 90000)}`,
      store: {
        id: storeId,
        name: storeName,
        image: storeImage,
        deliveryTime: uniqueStores[0].deliveryTime,
      },
      items: cartItems.map(ci => ({
        name: `${ci.item.name} (${ci.store.name})`,
        quantity: ci.quantity,
        price: ci.item.price,
        isVeg: ci.item.isVeg,
        addons: ci.selectedAddons.map(a => a.name),
      })),
      itemTotal,
      deliveryFee,
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
      driverPhone: '9366265129',
      driverRating: 4.9,
      driverPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      paymentMethod: paymentMethod || 'UPI / Online',
    };

    setOrders([newOrder, ...orders]);
    setCartItems([]);
    setIsCartOpen(false);
    setIsStoreModalOpen(false);

    // Save to Firebase Firestore Cloud DB (if configured)
    saveOrderToFirestore(newOrder);

    // Forward receipt directly to WhatsApp (+91 8949508256)
    sendOrderToWhatsApp(newOrder);

    // Switch to orders tab and show confirmation toast
    setActiveTab('orders');
    showToast('🎉 Order placed & sent to WhatsApp (+91 8949508256)!');
  };

  // Complete & remove order from list
  const handleCompleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    deleteOrderFromFirestore(orderId);
    showToast('✅ Order completed & removed');
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
    if (cat === 'south indian') return ['south indian', 'dosa', 'idli', 'vada', 'utthapam', 'upma', 'sambar', 'rasam', 'filter coffee', 'vaango', 'vengo'];
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

  // Calculate cart counts
  const totalCartCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, ci) => acc + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity, 0);
  // Only track active orders among the customer's top 4 recent orders
  const activeOrdersCount = orders.slice(0, 4).filter(o => o.status !== 'delivered').length;

  // Handlers to synchronize Admin updates to both Local State and Firebase Firestore Cloud
  const handleUpdateStores = (newStores: Store[]) => {
    setStores(newStores);
    saveStoresToFirestore(newStores).catch(err => console.warn('Firestore store sync notice:', err));
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    saveCategoriesToFirestore(newCategories).catch(err => console.warn('Firestore category sync notice:', err));
  };

  const handleUpdateOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    newOrders.forEach(o => saveOrderToFirestore(o).catch(err => console.warn('Firestore order sync notice:', err)));
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
                  onOpenCart={() => setIsCartOpen(true)}
                  cartCount={totalCartCount}
                  cartTotal={totalCartPrice}
                />

                {/* Categories Carousel Row */}
                <div className="mt-1">
                  <CategoryBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                  />
                </div>

                {/* Top Restaurants Heading */}
                <div className="px-4 mt-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                      {selectedCategory ? `${selectedCategory.toUpperCase()} SPOTS` : 'Featured Restaurants'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {filteredStores.length} stores delivering near you
                    </p>
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

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
                  onCompleteOrder={handleCompleteOrder}
                  onExploreFood={() => setActiveTab('home')}
                />
              </div>
            )}

            {/* Floating Cart Button if active tab is Home or Search and cart has items (Sticky when scrolling) */}
            {totalCartCount > 0 && activeTab !== 'orders' && (
              <div className="fixed bottom-18 left-4 right-4 max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl z-30 px-2 animate-in slide-in-from-bottom duration-200">
                <button
                  id="global-floating-cart-btn"
                  onClick={() => setIsCartOpen(true)}
                  className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between shadow-2xl shadow-red-600/30 active:scale-98 transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-black rounded-lg">
                      {totalCartCount} {totalCartCount === 1 ? 'ITEM' : 'ITEMS'}
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      ₹{totalCartPrice.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-black flex items-center uppercase tracking-wider">
                    View Cart →
                  </span>
                </button>
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
              onOpenCart={() => setIsCartOpen(true)}
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
              onOpenCart={() => setIsCartOpen(true)}
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

            {/* Cart Drawer & Checkout */}
            <CartDrawer
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              cartItems={cartItems}
              currentAddress={currentAddress}
              onOpenLocationModal={() => {
                setIsLocationModalOpen(true);
              }}
              onUpdateQuantity={(cartItemId, delta) => handleUpdateCartQuantity(cartItemId, delta)}
              onClearCart={() => setCartItems([])}
              onPlaceOrder={handlePlaceOrder}
            />

            {/* Location Picker Modal */}
            <LocationModal
              isOpen={isLocationModalOpen}
              onClose={() => setIsLocationModalOpen(false)}
              addresses={addresses}
              currentAddress={currentAddress}
              onSelectAddress={(addr) => setCurrentAddress(addr)}
              onAddAddress={(newAddr) => setAddresses([newAddr, ...addresses])}
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
