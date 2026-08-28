import React from 'react';
import { Home, Search, Receipt, ShoppingBag, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeOrdersCount?: number;
  cartItemsCount?: number;
  onOpenCart?: () => void;
  showAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
  cartItemsCount = 0,
  onOpenCart,
  showAdmin = false,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-gray-200/80 px-3 py-2 flex items-center justify-around shadow-lg max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
    >
      {/* Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onTabChange('home')}
        className="flex flex-col items-center justify-center min-w-[56px] focus:outline-hidden group"
      >
        <div
          className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            activeTab === 'home'
              ? 'bg-[#E11D48] text-white shadow-xs'
              : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          <Home className={`w-4 h-4 ${activeTab === 'home' ? 'fill-white stroke-white' : 'stroke-[2.2]'}`} />
        </div>
        <span
          className={`text-[11px] font-bold mt-0.5 tracking-tight transition-colors ${
            activeTab === 'home' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          Home
        </span>
      </button>

      {/* Search Tab */}
      <button
        id="nav-tab-search"
        onClick={() => onTabChange('search')}
        className="flex flex-col items-center justify-center min-w-[56px] focus:outline-hidden group"
      >
        <div
          className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            activeTab === 'search'
              ? 'bg-[#E11D48] text-white shadow-xs'
              : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          <Search className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[11px] font-bold mt-0.5 tracking-tight transition-colors ${
            activeTab === 'search' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          Search
        </span>
      </button>

      {/* Cart Tab (Always visible & interactive) */}
      <button
        id="nav-tab-cart"
        onClick={onOpenCart}
        className="relative flex flex-col items-center justify-center min-w-[56px] focus:outline-hidden group"
      >
        <div
          className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            cartItemsCount > 0
              ? 'bg-red-600 text-white shadow-xs animate-pulse'
              : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
        </div>
        {cartItemsCount > 0 && (
          <span className="absolute top-0 right-2 w-4 h-4 bg-gray-900 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {cartItemsCount}
          </span>
        )}
        <span
          className={`text-[11px] font-bold mt-0.5 tracking-tight transition-colors ${
            cartItemsCount > 0 ? 'text-red-600' : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          Cart
        </span>
      </button>

      {/* Orders Tab */}
      <button
        id="nav-tab-orders"
        onClick={() => onTabChange('orders')}
        className="relative flex flex-col items-center justify-center min-w-[56px] focus:outline-hidden group"
      >
        <div
          className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            activeTab === 'orders'
              ? 'bg-[#E11D48] text-white shadow-xs'
              : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4 stroke-[2.2]" />
        </div>
        {activeOrdersCount > 0 && (
          <span className="absolute top-0 right-2 w-4 h-4 bg-red-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
            {activeOrdersCount}
          </span>
        )}
        <span
          className={`text-[11px] font-bold mt-0.5 tracking-tight transition-colors ${
            activeTab === 'orders' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
          }`}
        >
          Orders
        </span>
      </button>

      {/* Admin Tab */}
      {showAdmin && (
        <button
          id="nav-tab-admin"
          onClick={() => onTabChange('admin')}
          className="flex flex-col items-center justify-center min-w-[56px] focus:outline-hidden group"
        >
          <div
            className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              activeTab === 'admin'
                ? 'bg-[#E11D48] text-white shadow-xs'
                : 'text-gray-600 group-hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span
            className={`text-[11px] font-bold mt-0.5 tracking-tight transition-colors ${
              activeTab === 'admin' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
            }`}
          >
            Admin
          </span>
        </button>
      )}
    </nav>
  );
};
