/**
 * @file BottomNav.js
 * @module components/BottomNav
 * @description
 * Fixed Mobile Bottom Navigation Dock for FoodZa.
 * 
 * Features:
 * - "Home": Main storefront restaurant feed.
 * - "Search": Omnisearch and cuisine discover tab.
 * - "Cart": Slide-over checkout drawer trigger with real-time badge count.
 * - "Orders": Customer order history and WhatsApp receipt trigger with active count badge.
 * - "Profile": Customer delivery profile, room number, saved addresses, and WhatsApp session.
 * - "Admin": Operations portal icon (conditionally rendered only when `showAdmin === true`).
 */

import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Home, Search, Receipt, ShoppingBag, Settings, User } from 'lucide-react';

export const BottomNav = ({
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
  cartItemsCount = 0,
  onOpenCart,
  showAdmin = false,
}) => {
  return _jsxs('nav', {
    id: 'bottom-navigation-bar',
    className:
      'fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-gray-200/80 px-2 py-2 flex items-center justify-around shadow-lg max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
    children: [
      // Home
      _jsxs('button', {
        id: 'nav-tab-home',
        onClick: () => onTabChange('home'),
        className: 'flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
        children: [
          _jsx('div', {
            className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              activeTab === 'home' ? 'bg-[#E11D48] text-white shadow-xs' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: _jsx(Home, {
              className: `w-4 h-4 ${activeTab === 'home' ? 'fill-white stroke-white' : 'stroke-[2.2]'}`
            }),
          }),
          _jsx('span', {
            className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
              activeTab === 'home' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: 'Home',
          }),
        ],
      }),

      // Search
      _jsxs('button', {
        id: 'nav-tab-search',
        onClick: () => onTabChange('search'),
        className: 'flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
        children: [
          _jsx('div', {
            className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              activeTab === 'search' ? 'bg-[#E11D48] text-white shadow-xs' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: _jsx(Search, { className: 'w-4 h-4 stroke-[2.2]' }),
          }),
          _jsx('span', {
            className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
              activeTab === 'search' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: 'Search',
          }),
        ],
      }),

      // Cart
      _jsxs('button', {
        id: 'nav-tab-cart',
        onClick: onOpenCart,
        className: 'relative flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
        children: [
          _jsx('div', {
            className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              cartItemsCount > 0 ? 'bg-red-600 text-white shadow-xs animate-pulse' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: _jsx(ShoppingBag, { className: 'w-4 h-4 stroke-[2.2]' }),
          }),
          cartItemsCount > 0 &&
            _jsx('span', {
              className:
                'absolute top-0 right-1.5 w-4 h-4 bg-gray-900 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white',
              children: cartItemsCount,
            }),
          _jsx('span', {
            className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
              cartItemsCount > 0 ? 'text-red-600' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: 'Cart',
          }),
        ],
      }),

      // Orders
      _jsxs('button', {
        id: 'nav-tab-orders',
        onClick: () => onTabChange('orders'),
        className: 'relative flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
        children: [
          _jsx('div', {
            className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              activeTab === 'orders' ? 'bg-[#E11D48] text-white shadow-xs' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: _jsx(Receipt, { className: 'w-4 h-4 stroke-[2.2]' }),
          }),
          activeOrdersCount > 0 &&
            _jsx('span', {
              className:
                'absolute top-0 right-1.5 w-4 h-4 bg-red-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white',
              children: activeOrdersCount,
            }),
          _jsx('span', {
            className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
              activeTab === 'orders' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: 'Orders',
          }),
        ],
      }),

      // Profile (Hostel Room & WhatsApp Account)
      _jsxs('button', {
        id: 'nav-tab-profile',
        onClick: () => onTabChange('profile'),
        className: 'flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
        children: [
          _jsx('div', {
            className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              activeTab === 'profile' ? 'bg-[#E11D48] text-white shadow-xs' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: _jsx(User, { className: 'w-4 h-4 stroke-[2.2]' }),
          }),
          _jsx('span', {
            className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
              activeTab === 'profile' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
            }`,
            children: 'Profile',
          }),
        ],
      }),

      // Admin (if privileged)
      showAdmin &&
        _jsxs('button', {
          id: 'nav-tab-admin',
          onClick: () => onTabChange('admin'),
          className: 'flex flex-col items-center justify-center min-w-[50px] focus:outline-hidden group',
          children: [
            _jsx('div', {
              className: `w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'admin' ? 'bg-[#E11D48] text-white shadow-xs' : 'text-gray-600 group-hover:text-gray-900'
              }`,
              children: _jsx(Settings, { className: 'w-4 h-4 stroke-[2.2]' }),
            }),
            _jsx('span', {
              className: `text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
                activeTab === 'admin' ? 'text-[#E11D48]' : 'text-gray-600 group-hover:text-gray-900'
              }`,
              children: 'Admin',
            }),
          ],
        }),
    ],
  });
};
