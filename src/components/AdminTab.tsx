import React, { useState } from 'react';
import { Store, Category, Order, MenuItem, OrderStatus, MenuItemAddon } from '../types';
import { 
  Building2, 
  Layers, 
  Utensils, 
  TrendingUp, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Info,
  DollarSign,
  LogOut,
  Cloud,
  Database,
  RefreshCw,
  Check,
  Sparkles,
  Phone,
  MapPin,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { 
  saveStoresToDb, 
  saveCategoriesToDb,
  seedDatabase,
  fetchDatabaseStatus,
  fetchOrdersFromDb,
  fetchStoresFromDb,
  fetchCategoriesFromDb,
  DatabaseStatus
} from '../services/api';
import { STORES, CATEGORIES } from '../data/mockData';

interface AdminTabProps {
  stores: Store[];
  categories: Category[];
  orders: Order[];
  onUpdateStores: (stores: Store[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onLogout?: () => void;
}

type AdminSubTab = 'overview' | 'stores' | 'items' | 'categories' | 'orders' | 'cloud';

export const AdminTab: React.FC<AdminTabProps> = ({
  stores,
  categories,
  orders,
  onUpdateStores,
  onUpdateCategories,
  onUpdateOrders,
  onLogout,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('overview');

  // Edit / Add Form States
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    deliveryTime: '25-35 mins',
    deliveryFee: 15,
    distance: '2.5 km',
    image: '',
    cuisines: '',
    tags: '',
  });

  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
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

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    image: '',
    slug: '',
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isFetchingDb, setIsFetchingDb] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered'>('all');

  const checkDb = async () => {
    setIsCheckingDb(true);
    try {
      const status = await fetchDatabaseStatus();
      setDbStatus(status);
    } catch (e: any) {
      setDbStatus({
        success: false,
        connected: false,
        database: 'PostgreSQL',
        error: e?.message || 'Failed to check database',
      });
    } finally {
      setIsCheckingDb(false);
    }
  };

  React.useEffect(() => {
    if (activeSubTab === 'cloud') {
      checkDb();
    }
  }, [activeSubTab]);

  const handleFetchFromPostgres = async () => {
    setIsFetchingDb(true);
    setCloudStatusMsg(null);
    try {
      const [pgStores, pgCats, pgOrders] = await Promise.all([
        fetchStoresFromDb(),
        fetchCategoriesFromDb(),
        fetchOrdersFromDb(),
      ]);

      let msgParts: string[] = [];
      if (pgStores && pgStores.length > 0) {
        onUpdateStores(pgStores);
        msgParts.push(`${pgStores.length} stores`);
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
        setCloudStatusMsg(`✅ Fetched and loaded ${msgParts.join(', ')} from PostgreSQL successfully!`);
      } else {
        setCloudStatusMsg(`ℹ️ Database connected, but tables are currently empty. Click "Push & Seed Data" to populate.`);
      }
    } catch (err: any) {
      setCloudStatusMsg(`⚠️ Failed to fetch from PostgreSQL: ${err?.message || 'Network error'}`);
    } finally {
      setIsFetchingDb(false);
    }
  };

  // Calculate Overview Stats
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const activeOrdersCount = orders.filter(o => o.status !== 'delivered').length;
  const totalItemsCount = stores.reduce((sum, s) => sum + (s.items?.length || 0), 0);

  // Store Handlers
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const cuisinesList = storeForm.cuisines.split(',').map(c => c.trim()).filter(Boolean);
    const tagsList = storeForm.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (isAddingStore) {
      const newStore: Store = {
        id: `store-${Date.now()}`,
        name: storeForm.name,
        rating: 4.5,
        reviewsCount: 1,
        deliveryTime: storeForm.deliveryTime,
        deliveryFee: Number(storeForm.deliveryFee),
        distance: storeForm.distance,
        image: storeForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        cuisines: cuisinesList.length ? cuisinesList : ['Pizzas', 'Burgers'],
        discountOffer: 'Flat 20% OFF',
        tags: tagsList,
        menuCategories: ['All'],
        items: [],
      };
      onUpdateStores([...stores, newStore]);
      setIsAddingStore(false);
    } else if (editingStore) {
      const updatedStores = stores.map(s => {
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
          };
        }
        return s;
      });
      onUpdateStores(updatedStores);
      setEditingStore(null);
    }

    setStoreForm({
      name: '',
      deliveryTime: '25-35 mins',
      deliveryFee: 15,
      distance: '2.5 km',
      image: '',
      cuisines: '',
      tags: '',
    });
  };

  const startEditStore = (store: Store) => {
    setEditingStore(store);
    setIsAddingStore(false);
    setStoreForm({
      name: store.name,
      deliveryTime: store.deliveryTime,
      deliveryFee: store.deliveryFee,
      distance: store.distance || '2.5 km',
      image: store.image,
      cuisines: store.cuisines.join(', '),
      tags: store.tags?.join(', ') || '',
    });
  };

  const handleDeleteStore = (storeId: string) => {
    if (confirm('Are you sure you want to delete this store and all its items?')) {
      onUpdateStores(stores.filter(s => s.id !== storeId));
    }
  };

  // Item Handlers
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStore = stores.find(s => s.id === selectedStoreId);
    if (!currentStore) return;

    if (isAddingItem) {
      const newItem: MenuItem = {
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
    } else if (editingItem) {
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

  const startEditItem = (item: MenuItem) => {
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

  const handleDeleteItem = (itemId: string) => {
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
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingCategory) {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: categoryForm.name,
        slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
        image: categoryForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
      };
      onUpdateCategories([...categories, newCat]);
      setIsAddingCategory(false);
    } else if (editingCategory) {
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

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setIsAddingCategory(false);
    setCategoryForm({
      name: cat.name,
      image: cat.image,
      slug: cat.slug,
    });
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('Delete this category?')) {
      onUpdateCategories(categories.filter(c => c.id !== catId));
    }
  };

  // Order Status Handler
  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
    const statusMap: Record<OrderStatus, OrderStatus> = {
      'placed': 'confirmed',
      'confirmed': 'cooking',
      'cooking': 'out_for_delivery',
      'out_for_delivery': 'delivered',
      'delivered': 'delivered',
    };
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: statusMap[currentStatus] };
      }
      return o;
    });
    onUpdateOrders(updatedOrders);
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      // Simulate delete order
      onUpdateOrders(orders.filter(o => o.id !== orderId));
    }
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen pb-24 text-gray-800">
      {/* Admin header */}
      <div className="bg-linear-to-r from-red-600 to-rose-500 text-white px-4 py-5 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center space-x-2">
            <Building2 className="w-6 h-6" />
            <span>FoodZa Admin Panel</span>
          </h1>
          <p className="text-xs text-rose-100 mt-0.5">Manage your stores, menus, categories, and tracking</p>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-xl text-xs font-bold text-white transition-colors border border-white/20 cursor-pointer shadow-xs"
            title="Log out of Admin Panel"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        )}
      </div>

      {/* Admin navigation tabs */}
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto no-scrollbar shadow-xs">
        {(['overview', 'stores', 'items', 'categories', 'orders', 'cloud'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-3 px-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
              activeSubTab === tab
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab === 'cloud' ? '🐘 PostgreSQL' : tab}
          </button>
        ))}
      </div>

      {/* Main admin view */}
      <div className="p-4 max-w-lg mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-5">
        
        {/* 1. OVERVIEW SUBTAB */}
        {activeSubTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Sales</div>
                  <div className="text-lg font-black text-gray-900">₹{totalRevenue.toFixed(0)}</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">Active Orders</div>
                  <div className="text-lg font-black text-gray-900">{activeOrdersCount}</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Stores</div>
                  <div className="text-lg font-black text-gray-900">{stores.length}</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">Menu Items</div>
                  <div className="text-lg font-black text-gray-900">{totalItemsCount}</div>
                </div>
              </div>
            </div>

            {/* Quick Orders List */}
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 space-y-3">
              <h3 className="font-extrabold text-sm text-gray-900">Recent Live Orders</h3>
              {orders.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">No recent orders placed</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-gray-900">{order.store.name} ({order.orderNumber})</div>
                        <div className="text-gray-500 mt-0.5">₹{order.grandTotal.toFixed(0)} • {order.items.length} items</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'out_for_delivery'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700 animate-pulse'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. STORES SUBTAB */}
        {activeSubTab === 'stores' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-gray-900">Manage Stores</h3>
              <button
                onClick={() => {
                  setIsAddingStore(true);
                  setEditingStore(null);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Store</span>
              </button>
            </div>

            {/* Add / Edit Form */}
            {(isAddingStore || editingStore) && (
              <form onSubmit={handleSaveStore} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
                <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">
                  {isAddingStore ? 'Add New Store' : 'Edit Store Details'}
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Store Name</label>
                    <input
                      type="text"
                      required
                      value={storeForm.name}
                      onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. KFC, Subway, Vaango"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Delivery Time</label>
                      <input
                        type="text"
                        value={storeForm.deliveryTime}
                        onChange={e => setStoreForm({ ...storeForm, deliveryTime: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-xl"
                        placeholder="e.g. 20-30 mins"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Delivery Fee (₹)</label>
                      <input
                        type="number"
                        value={storeForm.deliveryFee}
                        onChange={e => setStoreForm({ ...storeForm, deliveryFee: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Cuisines (comma separated)</label>
                    <input
                      type="text"
                      value={storeForm.cuisines}
                      onChange={e => setStoreForm({ ...storeForm, cuisines: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. Pizzas, Desserts, Burgers"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Store Card Image URL</label>
                    <input
                      type="text"
                      value={storeForm.image}
                      onChange={e => setStoreForm({ ...storeForm, image: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-xl"
                      placeholder="Image URL or local path"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
                  >
                    Save Store
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStore(false);
                      setEditingStore(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Stores List */}
            <div className="space-y-2">
              {stores.map(store => (
                <div key={store.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <img
                      src={store.image}
                      alt={store.name}
                      className="w-12 h-12 rounded-xl object-cover border"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{store.name}</h4>
                      <p className="text-xs text-gray-500">{store.cuisines.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditStore(store)}
                      className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                      title="Edit Store"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStore(store.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                      title="Delete Store"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. MENU ITEMS SUBTAB */}
        {activeSubTab === 'items' && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Select Store to Edit Menu</label>
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-white font-bold"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {selectedStoreId && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-gray-900">
                    Menu of {stores.find(s => s.id === selectedStoreId)?.name}
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingItem(true);
                      setEditingItem(null);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Menu Item</span>
                  </button>
                </div>

                {/* Add / Edit Form */}
                {(isAddingItem || editingItem) && (
                  <form onSubmit={handleSaveItem} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
                    <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">
                      {isAddingItem ? 'Add New Menu Item' : 'Edit Menu Item'}
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block font-bold mb-1">Item Name</label>
                        <input
                          type="text"
                          required
                          value={itemForm.name}
                          onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                          className="w-full p-2 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold mb-1">Price (₹)</label>
                          <input
                            type="number"
                            required
                            value={itemForm.price}
                            onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                            className="w-full p-2 border border-gray-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Category</label>
                          <input
                            type="text"
                            required
                            value={itemForm.category}
                            onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                            className="w-full p-2 border border-gray-200 rounded-xl"
                            placeholder="e.g. Veg Pizzas, Scoops"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-4 py-1">
                        <label className="flex items-center space-x-1.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itemForm.isVeg}
                            onChange={e => setItemForm({ ...itemForm, isVeg: e.target.checked })}
                          />
                          <span>Pure Veg</span>
                        </label>
                        <label className="flex items-center space-x-1.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itemForm.isBestseller}
                            onChange={e => setItemForm({ ...itemForm, isBestseller: e.target.checked })}
                          />
                          <span>Bestseller Tag</span>
                        </label>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Description</label>
                        <textarea
                          value={itemForm.description}
                          onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                          className="w-full p-2 border border-gray-200 rounded-xl h-16 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Item Image URL</label>
                        <input
                          type="text"
                          value={itemForm.image}
                          onChange={e => setItemForm({ ...itemForm, image: e.target.value })}
                          className="w-full p-2 border border-gray-200 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
                      >
                        Save Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingItem(false);
                          setEditingItem(null);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Items List */}
                <div className="space-y-2">
                  {(stores.find(s => s.id === selectedStoreId)?.items || []).map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80';
                          }}
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                            <span className="font-extrabold text-xs text-gray-900">{item.name}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">₹{item.price} • {item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditItem(item)}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. CATEGORIES SUBTAB */}
        {activeSubTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-gray-900">Home Categories Slider</h3>
              <button
                onClick={() => {
                  setIsAddingCategory(true);
                  setEditingCategory(null);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Add / Edit Form */}
            {(isAddingCategory || editingCategory) && (
              <form onSubmit={handleSaveCategory} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
                <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">
                  {isAddingCategory ? 'Add Category' : 'Edit Category'}
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Category Name</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Image URL</label>
                    <input
                      type="text"
                      value={categoryForm.image}
                      onChange={e => setCategoryForm({ ...categoryForm, image: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
                  >
                    Save Category
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setEditingCategory(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Categories List */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex flex-col items-center shadow-xs text-center relative group">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-12 h-12 rounded-full object-cover border"
                  />
                  <span className="font-extrabold text-xs text-gray-900 mt-2">{cat.name}</span>
                  <div className="flex items-center space-x-1.5 mt-3">
                    <button
                      onClick={() => startEditCategory(cat)}
                      className="p-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. ORDERS SUBTAB */}
        {activeSubTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Live Order Fulfillment Tracker</h3>
                <p className="text-xs text-gray-500">Total {orders.length} orders recorded</p>
              </div>
              
              {/* Order Status Filters */}
              <div className="flex bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter('active')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'active' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Active ({orders.filter(o => o.status !== 'delivered').length})
                </button>
                <button
                  onClick={() => setOrderFilter('delivered')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'delivered' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Delivered ({orders.filter(o => o.status === 'delivered').length})
                </button>
              </div>
            </div>

            {(() => {
              const displayedOrders = orders.filter(o => {
                if (orderFilter === 'active') return o.status !== 'delivered';
                if (orderFilter === 'delivered') return o.status === 'delivered';
                return true;
              });

              if (displayedOrders.length === 0) {
                return (
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-700">No {orderFilter === 'all' ? '' : orderFilter} orders found</div>
                    <p className="text-[11px] text-gray-400">When customers place orders, they will appear here live with address and phone number.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {displayedOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-extrabold text-sm text-gray-900">{order.store.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Order ID: {order.orderNumber} • {order.placedAt}</div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Customer contact & address */}
                      <div className="p-2.5 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-700">
                        {order.customerPhone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 font-bold text-gray-900">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Customer: {order.customerPhone}</span>
                            </div>
                            <a
                              href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center space-x-1 hover:bg-emerald-700"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                        {order.deliveryAddress && (
                          <div className="flex items-start space-x-1.5 text-[11px] text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>{order.deliveryAddress}</span>
                          </div>
                        )}
                        {order.paymentMethod && (
                          <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 font-medium">
                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                            <span>Payment: {order.paymentMethod}</span>
                          </div>
                        )}
                      </div>

                      {/* Order items */}
                      <div className="text-xs text-gray-600 pl-2 border-l-2 border-red-200 space-y-1 py-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-semibold">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
                        <span className="font-bold text-gray-900 text-sm">Total: ₹{order.grandTotal.toFixed(0)}</span>
                        <div className="flex space-x-2">
                          {order.status !== 'delivered' && (
                            <button
                              onClick={() => handleAdvanceStatus(order.id, order.status)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold transition-all active:scale-95"
                            >
                              <span>Next Step</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold transition-all"
                          >
                            Cancel / Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* 6. POSTGRESQL DATABASE SUBTAB */}
        {activeSubTab === 'cloud' && (
          <div className="space-y-5">
            {/* Status & Health Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">🐘 PostgreSQL Database</h3>
                    <p className="text-xs text-gray-500">Live storage & real-time sync for stores, menus, and customer orders</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={checkDb}
                    disabled={isCheckingDb}
                    title="Test PostgreSQL connection"
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  </button>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    dbStatus?.connected
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : dbStatus?.connected === false
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {isCheckingDb
                      ? '⏳ Checking...'
                      : dbStatus?.connected
                      ? '🟢 PostgreSQL Connected'
                      : '🔴 Disconnected / Pending URI'}
                  </span>
                </div>
              </div>

              {dbStatus?.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start space-x-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Database Connection Notice:</p>
                    <p className="font-mono text-[11px] mt-0.5">{dbStatus.error}</p>
                  </div>
                </div>
              )}

              {cloudStatusMsg && (
                <div className="p-3.5 bg-gray-900 text-white text-xs rounded-2xl flex items-center space-x-2 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{cloudStatusMsg}</span>
                </div>
              )}

              {/* PostgreSQL Live Table Counters */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                  <div className="text-lg font-black text-gray-900">
                    {dbStatus?.counts ? dbStatus.counts.stores : stores.length}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Stores in DB</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                  <div className="text-lg font-black text-gray-900">
                    {dbStatus?.counts ? dbStatus.counts.categories : categories.length}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Categories in DB</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                  <div className="text-lg font-black text-gray-900">
                    {dbStatus?.counts ? dbStatus.counts.orders : orders.length}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Orders in DB</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Fetch from PostgreSQL */}
                <button
                  type="button"
                  disabled={isFetchingDb}
                  onClick={handleFetchFromPostgres}
                  className="p-3.5 bg-indigo-50 hover:bg-indigo-100 active:scale-98 border border-indigo-200 text-indigo-900 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-600 ${isFetchingDb ? 'animate-spin' : ''}`} />
                  <span>{isFetchingDb ? 'Fetching from PostgreSQL...' : '📥 Fetch Data from PostgreSQL'}</span>
                </button>

                {/* 2. Push & Seed to PostgreSQL */}
                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={async () => {
                    setIsCloudSyncing(true);
                    setCloudStatusMsg(null);
                    try {
                      const allStoresToSync = [...STORES];
                      stores.forEach(s => {
                        const idx = allStoresToSync.findIndex(existing => existing.id === s.id);
                        if (idx >= 0) {
                          allStoresToSync[idx] = s;
                        } else {
                          allStoresToSync.push(s);
                        }
                      });

                      const allCatsToSync = [...CATEGORIES];
                      categories.forEach(c => {
                        const idx = allCatsToSync.findIndex(existing => existing.id === c.id);
                        if (idx >= 0) {
                          allCatsToSync[idx] = c;
                        } else {
                          allCatsToSync.push(c);
                        }
                      });

                      await saveStoresToDb(allStoresToSync);
                      await saveCategoriesToDb(allCatsToSync);
                      await seedDatabase(allStoresToSync, allCatsToSync);
                      onUpdateStores(allStoresToSync);
                      onUpdateCategories(allCatsToSync);
                      await checkDb();
                      setCloudStatusMsg(`✅ Successfully synced ${allStoresToSync.length} stores & ${allCatsToSync.length} categories to PostgreSQL!`);
                    } catch (e: any) {
                      setCloudStatusMsg(`⚠️ Failed to sync to PostgreSQL: ${e?.message || 'Check DATABASE_URL'}`);
                    } finally {
                      setIsCloudSyncing(false);
                    }
                  }}
                  className="p-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  <Sparkles className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Syncing to PostgreSQL...' : '📤 Push & Seed to PostgreSQL'}</span>
                </button>
              </div>
            </div>

            {/* PostgreSQL Setup Instructions Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">PostgreSQL Connection Setup</h3>
                <p className="text-xs text-gray-500">Configure your database environment variable in .env.local or cloud deployment</p>
              </div>

              <div className="space-y-3 text-xs text-gray-700">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Environment Variable (.env.local / Vercel):</label>
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 font-mono text-[11px] text-gray-800 break-all select-all">
                    DATABASE_URL=postgresql://postgres:&lt;password&gt;@ep-xyz.region.aws.neon.tech/food_connect?sslmode=require
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-gray-600">
                  <p className="font-bold text-gray-800">💡 Free PostgreSQL Providers:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong><a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">Neon.tech</a> (Recommended, Free Serverless Postgres)</strong>: Create a database in 10 seconds and copy the Connection String.
                    </li>
                    <li>
                      <strong><a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">Supabase</a></strong>: Free tier PostgreSQL with built-in dashboard and pooling.
                    </li>
                    <li>
                      <strong><a href="https://render.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">Render</a> or Railway</strong>: Free/inexpensive managed PostgreSQL instance.
                    </li>
                    <li>
                      <strong>Localhost</strong>: <code>DATABASE_URL=postgresql://postgres:password@localhost:5432/food_connect</code>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <p className="font-bold text-gray-800">🚀 Automatic Table Initialization:</p>
                    <p>Tables (<code>stores</code>, <code>categories</code>, <code>orders</code>) are automatically created on first connect with optimal indexes!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
