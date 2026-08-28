import React, { useState } from 'react';
import { User, MapPin, CreditCard, Heart, Shield, HelpCircle, ChevronRight, Bell, Leaf, LogOut } from 'lucide-react';
import { UserAddress } from '../types';

interface ProfileTabProps {
  currentAddress: UserAddress;
  addresses: UserAddress[];
  onOpenLocationModal: () => void;
  favoritesCount: number;
  onViewFavorites: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentAddress,
  addresses,
  onOpenLocationModal,
  favoritesCount,
  onViewFavorites,
}) => {
  const [vegOnlyMode, setVegOnlyMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-6 px-4 py-4 pb-28 max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex items-center space-x-4">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
            alt="Profile Avatar"
            className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-xs"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-black text-gray-900 truncate">Kushal Choudhary</h3>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
              GOLD
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">kushal.choudhary8949@gmail.com</p>
          <p className="text-xs text-gray-400 font-medium">+1 (555) 019-2834</p>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Diet & Preferences</h4>

        {/* Veg Only Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Pure Vegetarian Mode</span>
              <span className="text-xs text-gray-500">Show only vegetarian restaurants & dishes</span>
            </div>
          </div>
          <button
            onClick={() => setVegOnlyMode(!vegOnlyMode)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              vegOnlyMode ? 'bg-emerald-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                vegOnlyMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Order Status Updates</span>
              <span className="text-xs text-gray-500">Real-time driver & food status alerts</span>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              notifications ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                notifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Account Settings List */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Manage Account</h4>

        {/* Saved Addresses */}
        <button
          onClick={onOpenLocationModal}
          className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 text-gray-700 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Saved Addresses</span>
              <span className="text-xs text-gray-500">{addresses.length} addresses configured</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Favorites */}
        <button
          onClick={onViewFavorites}
          className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Heart className="w-4 h-4 fill-red-500" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Favorite Restaurants</span>
              <span className="text-xs text-gray-500">{favoritesCount} saved stores</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Payment Methods */}
        <button
          onClick={() => alert('Payment methods: Apple Pay, Visa •••• 4242, Mastercard •••• 8821 active.')}
          className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 text-gray-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Payment Methods</span>
              <span className="text-xs text-gray-500">Apple Pay, Saved Cards</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Help & Support */}
        <button
          onClick={() => alert('Customer Support is ready to assist. Contact: +91 7682890864')}
          className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 text-gray-700 rounded-xl">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block">Help & Support</span>
              <span className="text-xs text-gray-500">FAQs, Live Chat, Order Issues</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={() => alert('Logged out successfully')}
        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out Account</span>
      </button>
    </div>
  );
};
