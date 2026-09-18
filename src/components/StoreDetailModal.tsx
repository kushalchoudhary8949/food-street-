import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, Search, Plus, Minus, Clock, Store as StoreIcon, ChevronLeft } from 'lucide-react';
import { Store, MenuItem, CartItem, MenuItemAddon } from '../types';

interface StoreDetailModalProps {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (storeId: string) => void;
  cartItems: CartItem[];
  onOpenItemModal: (item: MenuItem) => void;
  onUpdateCartQuantity: (cartItemIdOrItemId: string, delta: number) => void;
  onOpenCart: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  cartItems,
  onOpenItemModal,
  onUpdateCartQuantity,
  onOpenCart,
}) => {
  const hasOutlets = Boolean(store && store.outlets && store.outlets.length > 0);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  useEffect(() => {
    if (store) {
      if (store.outlets && store.outlets.length > 0) {
        setSelectedOutletId('select');
      } else {
        setSelectedOutletId('all');
      }
      setSelectedCategory('all');
      setMenuSearch('');
    }
  }, [store?.id]);

  if (!isOpen || !store) return null;

  const currentOutlet = hasOutlets && selectedOutletId && selectedOutletId !== 'all' && selectedOutletId !== 'select'
    ? store.outlets?.find(o => o.id === selectedOutletId)
    : null;

  // Helper to find outlet for an item
  const getOutletForItem = (item: MenuItem): Store | undefined => {
    if (!hasOutlets) return undefined;
    return store.outlets?.find((o) => o.id === item.storeId);
  };

  // Cuisines display
  const cuisinesText = currentOutlet ? currentOutlet.cuisines.join(', ') : store.cuisines.join(', ');

  // Filter items by outlet first if outlets exist
  const outletFilteredItems = hasOutlets && selectedOutletId !== 'all' && selectedOutletId !== 'select'
    ? store.items.filter((item) => item.storeId === selectedOutletId)
    : store.items;

  const uniqueItems = outletFilteredItems.filter((item, index, items) =>
    items.findIndex((candidate) => candidate.id === item.id || (candidate.name === item.name && candidate.isVeg === item.isVeg && candidate.storeId === item.storeId)) === index
  );

  // Compute available categories dynamically
  const availableCategories = currentOutlet 
    ? currentOutlet.menuCategories 
    : (hasOutlets && selectedOutletId !== 'all' && selectedOutletId !== 'select'
      ? Array.from(new Set(uniqueItems.map(i => i.category)))
      : store.menuCategories);

  // Filtered menu items
  const filteredItems = uniqueItems.filter((item) => {
    if (vegOnly && !item.isVeg) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const outletName = getOutletForItem(item)?.name.toLowerCase() || '';
      if (!matchName && !matchDesc && !outletName.includes(q)) return false;
    }
    return true;
  });

  // Calculate items in cart for this store (or its outlets)
  const storeCartItems = cartItems.filter(ci => 
    ci.store.id === store.id || (store.outlets && store.outlets.some(o => o.id === ci.store.id))
  );
  const storeCartCount = storeCartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const storeCartSubtotal = storeCartItems.reduce(
    (sum, ci) => sum + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity,
    0
  );

  const getItemCountInCart = (itemId: string) => {
    return cartItems
      .filter(c => c.item.id === itemId)
      .reduce((acc, c) => acc + c.quantity, 0);
  };

  const handleHeaderBack = () => {
    if (hasOutlets && selectedOutletId !== 'select') {
      setSelectedOutletId('select');
      setSelectedCategory('all');
      setMenuSearch('');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen relative flex flex-col shadow-2xl">
        {/* Sticky Header Nav with Blur */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={handleHeaderBack}
            className="h-10 px-3 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center gap-1 text-gray-800 transition-colors text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            {hasOutlets && selectedOutletId !== 'select' && (
              <span className="hidden sm:inline">Stores</span>
            )}
          </button>

          <div className="text-center px-2 truncate">
            <h2 className="text-base font-extrabold text-gray-900 truncate">
              {currentOutlet ? currentOutlet.name : store.name}
            </h2>
            <p className="text-[11px] text-gray-500 truncate">
              {currentOutlet ? `Food Street Outlet • ${currentOutlet.deliveryTime}` : cuisinesText}
            </p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onToggleFavorite(store.id)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'
                }`}
              />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: currentOutlet ? currentOutlet.name : store.name, url: window.location.href });
                }
              }}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Image Box */}
        <div className="relative w-full h-52 sm:h-60 bg-gray-900 overflow-hidden flex items-center justify-center">
          <img
            src={currentOutlet ? currentOutlet.image : store.image}
            alt={currentOutlet ? currentOutlet.name : store.name}
            className="w-full h-full object-cover transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black drop-shadow-sm">
                {currentOutlet ? currentOutlet.name : store.name}
              </h1>
              {hasOutlets && (
                <span className="px-2.5 py-0.5 bg-red-600/90 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                  Food Court
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-200 mt-1 font-medium drop-shadow-xs">{cuisinesText}</p>
          </div>
        </div>

        {/* Store Info Bar */}
        <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-gray-100 text-xs font-semibold text-gray-600">
          <div className="flex items-center space-x-3">
            {(!hasOutlets || currentOutlet) && (
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-red-600 stroke-[2.2]" />
                <span className="text-gray-900 font-bold">{currentOutlet ? currentOutlet.deliveryTime : store.deliveryTime}</span>
              </div>
            )}
            {(currentOutlet?.distance || store.distance) && (
              <span className="text-gray-400 font-medium">
                {(!hasOutlets || currentOutlet) && "• "}
                {currentOutlet ? currentOutlet.distance : store.distance} away
              </span>
            )}
          </div>
        </div>

        {/* View Mode 1: Food Court Store Selection Grid */}
        {hasOutlets && selectedOutletId === 'select' ? (
          <div className="p-4 space-y-4 pb-28">
            <div className="bg-linear-to-r from-red-600 via-red-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg">
              <div className="flex items-center space-x-2">
                <StoreIcon className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-200">The Food Street • 6 Outlets</span>
              </div>
              <h3 className="text-xl font-black mt-1">Select a Store to View Menu</h3>
              <p className="text-xs font-medium opacity-90 mt-1 leading-relaxed">
                Explore signature menus from all 6 iconic food spots inside The Food Street. Tap any store below to order!
              </p>
            </div>

            <div className="pt-1">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                Select Restaurant ({store.outlets?.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {store.outlets?.map((outlet) => {
                const outletItemCount = store.items.filter(i => i.storeId === outlet.id).length;
                return (
                  <button
                    key={outlet.id}
                    onClick={() => {
                      setSelectedOutletId(outlet.id);
                      setSelectedCategory('all');
                      setMenuSearch('');
                    }}
                    className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm hover:border-red-400 hover:shadow-md transition-all text-left flex items-center space-x-3.5 group cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      <img
                        src={outlet.image}
                        alt={outlet.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-base font-extrabold text-gray-900 group-hover:text-red-600 transition-colors truncate">
                          {outlet.name}
                        </h5>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        {outlet.cuisines.slice(0, 3).join(', ')}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400">
                          {outlet.deliveryTime} • {outlet.distance}
                        </span>
                        <span className="text-xs font-black text-red-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          View Menu →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sticky Floating View Cart Bar in Store Selection View */}
            {storeCartCount > 0 && (
              <div className="sticky bottom-4 z-40 py-2 mt-auto">
                <button
                  id="store-view-cart-floating-btn-grid"
                  onClick={onOpenCart}
                  className="w-full min-h-[52px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-2xl transition-all active:scale-98 animate-in slide-in-from-bottom duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 leading-none">
                    <span className="inline-flex items-center justify-center h-7 px-2.5 bg-red-800 text-white text-[10px] sm:text-xs font-black rounded-md shrink-0 leading-none">
                      {storeCartCount} {storeCartCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-sm font-extrabold leading-none">₹{storeCartSubtotal.toFixed(0)}</span>
                  </div>
                  <span className="flex items-center text-xs sm:text-sm font-black uppercase tracking-wider leading-none whitespace-nowrap">
                    View Cart <span aria-hidden="true">→</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* View Mode 2: Specific Selected Store Menu Feed */
          <>
            {/* Sticky Filters & Category Tabs Header */}
            <div className="sticky top-[61px] z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs py-3 px-4 space-y-3">

              {/* Controls & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Veg Only Switch */}
                <button
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    vegOnly ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${
                    vegOnly ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-600'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </span>
                  <span>Pure Veg Only</span>
                </button>

                {/* In-store Search */}
                <div className="relative flex-1 min-w-[170px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder={currentOutlet ? `Search in ${currentOutlet.name}...` : "Search in menu..."}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Menu Category Tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 pb-0.5 -mx-4 px-4">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  All Items ({uniqueItems.length})
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Feed */}
            <div className="p-4 space-y-3 pb-28">
              {filteredItems.map((item) => {
                const countInCart = getItemCountInCart(item.id);
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const isAvailableToday = !item.availableOnDays || item.availableOnDays.length === 0 || item.availableOnDays.includes(today);
                const outlet = getOutletForItem(item);
                return (
                  <div
                    key={item.id}
                    id={`menu-item-${item.id}`}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-start justify-between gap-4 hover:border-gray-200 transition-all"
                  >
                    {/* Left details */}
                    <div className="flex-1">
                      {/* Veg / Non-veg marker & Bestseller tag */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className={`w-4 h-4 border flex items-center justify-center rounded-xs ${
                          item.isVeg ? 'border-emerald-600' : 'border-red-600'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                        </span>
                        {item.isBestseller && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                            Bestseller
                          </span>
                        )}
                      </div>

                      {/* Item Name */}
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">{item.name}</h4>

                      {/* Price */}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-bold text-gray-900">₹{item.price.toFixed(0)}</span>
                        {item.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">₹{item.originalPrice.toFixed(0)}</span>
                        )}
                      </div>

                      {!isAvailableToday && (
                        <div className="mt-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                          Only available on {item.availableOnDays?.join(', ')}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Right Image & Action Button */}
                    <div className="relative shrink-0 flex flex-col items-center">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80';
                          }}
                        />
                      </div>

                      {/* Add or Counter Button */}
                      <div className="-mt-4 relative z-10">
                        {!isAvailableToday ? (
                          <button
                            disabled
                            className="px-4 py-1.5 bg-gray-200 text-gray-500 border border-gray-300 text-[10px] font-black rounded-xl shadow-sm uppercase tracking-wider cursor-not-allowed"
                          >
                            ONLY ON WED
                          </button>
                        ) : countInCart === 0 ? (
                          <button
                            id={`add-btn-${item.id}`}
                            onClick={() => onOpenItemModal(item)}
                            className="px-5 py-1.5 bg-white text-red-600 hover:bg-red-50 border border-red-200 text-xs font-black rounded-xl shadow-md uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center bg-red-600 text-white rounded-xl shadow-md p-0.5">
                            <button
                              onClick={() => onUpdateCartQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-red-700 rounded-lg transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-black">{countInCart}</span>
                            <button
                              onClick={() => onUpdateCartQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-red-700 rounded-lg transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {item.addons && item.addons.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium mt-1">customisable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sticky Floating View Cart Bar */}
            {storeCartCount > 0 && (
              <div className="sticky bottom-4 z-40 px-4 py-2 mt-auto">
                <button
                  id="store-view-cart-floating-btn"
                  onClick={onOpenCart}
                  className="w-full min-h-[52px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-2xl transition-all active:scale-98 animate-in slide-in-from-bottom duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 leading-none">
                    <span className="inline-flex items-center justify-center h-7 px-2.5 bg-red-800 text-white text-[10px] sm:text-xs font-black rounded-md shrink-0 leading-none">
                      {storeCartCount} {storeCartCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-sm font-extrabold leading-none">₹{storeCartSubtotal.toFixed(0)}</span>
                  </div>
                  <span className="flex items-center text-xs sm:text-sm font-black uppercase tracking-wider leading-none whitespace-nowrap">
                    View Cart <span aria-hidden="true">→</span>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
