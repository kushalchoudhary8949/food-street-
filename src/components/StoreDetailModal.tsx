import React, { useState } from 'react';
import { ArrowLeft, Heart, Share2, Search, Plus, Minus, Clock } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  if (!isOpen || !store) return null;

  // Cuisines display
  const cuisinesText = store.cuisines.join(', ');

  // Filtered menu items
  const filteredItems = store.items.filter((item) => {
    if (vegOnly && !item.isVeg) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Calculate items in cart for this store
  const storeCartItems = cartItems.filter(ci => ci.store.id === store.id);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen relative flex flex-col shadow-2xl">
        {/* Sticky Header Nav with Blur */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center px-2 truncate">
            <h2 className="text-base font-extrabold text-gray-900 truncate">{store.name}</h2>
            <p className="text-[11px] text-gray-500 truncate">{cuisinesText}</p>
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
                  navigator.share({ title: store.name, url: window.location.href });
                }
              }}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Image Box */}
        <div className="relative w-full h-56 sm:h-64 bg-gray-900 overflow-hidden flex items-center justify-center">
          <img
            src={store.image}
            alt={store.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
            <h1 className="text-2xl sm:text-3xl font-black drop-shadow-sm">{store.name}</h1>
            <p className="text-xs sm:text-sm text-gray-200 mt-1 font-medium drop-shadow-xs">{cuisinesText}</p>
          </div>
        </div>

        {/* Store Info */}
        <div className="px-4 py-3 bg-white flex items-center border-b border-gray-100 text-xs font-semibold text-gray-600">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-red-600 stroke-[2.2]" />
              <span className="text-gray-900 font-bold">{store.deliveryTime}</span>
            </div>
            {store.distance && (
              <span className="text-gray-400 font-medium">• {store.distance} away</span>
            )}
          </div>
        </div>

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
                placeholder="Search in menu..."
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
              All Items ({store.items.length})
            </button>
            {store.menuCategories.map((cat) => (
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
            return (
              <div
                key={item.id}
                id={`menu-item-${item.id}`}
                className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-start justify-between gap-4 hover:border-gray-200 transition-all"
              >
                {/* Left details */}
                <div className="flex-1">
                  {/* Veg / Non-veg marker & Bestseller tag */}
                  <div className="flex items-center space-x-2 mb-1.5">
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
                    {countInCart === 0 ? (
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
      </div>

      {/* Floating Bottom Cart Bar - placed outside scrollable container so it's always visible */}
      {storeCartCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[60] pointer-events-none">
          <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl px-4 pointer-events-auto">
            <button
              id="store-view-cart-floating-btn"
              onClick={onOpenCart}
              className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between shadow-2xl transition-all active:scale-98 animate-in slide-in-from-bottom duration-300"
            >
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-red-800 text-white text-xs font-black rounded-md">
                  {storeCartCount} {storeCartCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-sm font-extrabold">₹{storeCartSubtotal.toFixed(0)}</span>
              </div>
              <span className="text-sm font-bold flex items-center uppercase tracking-wider">
                View Cart →
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
