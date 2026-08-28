import React from 'react';
import { MapPin, Search, ChevronDown, ShoppingBag } from 'lucide-react';
import { UserAddress } from '../types';

interface HeaderProps {
  currentAddress: UserAddress;
  onOpenLocationModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
  onAvatarClick?: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
  cartTotal?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentAddress,
  onOpenLocationModal,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onAvatarClick,
  onOpenCart,
  cartCount = 0,
  cartTotal = 0,
}) => {
  return (
    <header className="bg-white px-4 pt-3 pb-2 sticky top-0 z-30 shadow-xs border-b border-gray-100/80">
      {/* Top row: Location & Cart + Profile Avatar */}
      <div className="flex items-center justify-between pb-3">
        {/* Delivery Location Pill/Button */}
        <button
          id="location-picker-btn"
          onClick={onOpenLocationModal}
          className="flex items-center space-x-1.5 text-left group transition-all"
        >
          <div className="text-red-600 transition-transform group-hover:scale-110">
            <MapPin className="w-5 h-5 fill-red-600/10 stroke-red-600 stroke-[2.2]" />
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#c5221f] tracking-tight hover:text-red-700 transition-colors">
              Delivery to {currentAddress.label}
            </span>
            <ChevronDown className="w-4 h-4 text-[#c5221f] stroke-[2.5] opacity-70 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Right Actions: Sticky Cart + Profile Avatar */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Cart Button */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-2xl border transition-all ${
              cartCount > 0
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20 hover:bg-red-700 active:scale-95'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
            }`}
            title="Open Shopping Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 w-4 h-4 bg-white text-red-600 text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            {cartCount > 0 && (
              <span className="text-xs font-black tracking-tight hidden xs:inline">
                ₹{cartTotal.toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar matching screenshot */}
      <div className="relative mt-0.5 mb-1.5">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
          <Search className="w-5 h-5 stroke-[2]" />
        </div>
        <input
          id="main-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          placeholder="Search for burgers, pizza, or biryani..."
          className="w-full pl-11 pr-4 py-3 bg-white text-gray-800 text-sm font-medium placeholder-gray-500 rounded-full border border-gray-200 focus:outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 text-xs font-semibold"
          >
            Clear
          </button>
        )}
      </div>
    </header>
  );
};
