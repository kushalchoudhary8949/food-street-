import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { MenuItem, MenuItemAddon } from '../types';

interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, selectedAddons: MenuItemAddon[]) => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  if (!item) return null;

  const toggleAddon = (addonId: string) => {
    if (selectedAddonIds.includes(addonId)) {
      setSelectedAddonIds(selectedAddonIds.filter(id => id !== addonId));
    } else {
      setSelectedAddonIds([...selectedAddonIds, addonId]);
    }
  };

  const selectedAddons = (item.addons || []).filter(a => selectedAddonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = (item.price + addonsTotal) * quantity;

  const handleConfirm = () => {
    onAddToCart(item, quantity, selectedAddons);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Item Image & Close button */}
        <div className="relative w-full h-56 bg-gray-100 shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs text-gray-800 flex items-center justify-center hover:bg-white shadow-md transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Veg / Non-Veg badge */}
          <div className="absolute top-4 left-4">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              item.isVeg ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
              <span>{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
            </span>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-extrabold text-gray-900 leading-snug">{item.name}</h3>
              <span className="text-lg font-black text-gray-900 shrink-0 ml-3">
                ₹{item.price.toFixed(0)}
              </span>
            </div>

            <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">{item.description}</p>
          </div>

          {/* Add-ons list if any */}
          {item.addons && item.addons.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-bold text-gray-900 mb-1">Customise Your Dish</h4>
              <p className="text-xs text-gray-500 mb-3">Select your favorite toppings and dips</p>
              
              <div className="space-y-2">
                {item.addons.map((addon) => {
                  const isChecked = selectedAddonIds.includes(addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked ? 'border-red-500 bg-red-50/40' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">{addon.name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900">+₹{addon.price.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-100 flex items-center justify-between gap-4">
          {/* Quantity Counter */}
          <div className="flex items-center border border-gray-200 rounded-2xl p-1 bg-gray-50 shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-gray-900">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            id="add-item-modal-btn"
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-extrabold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all"
          >
            <span>Add Item</span>
            <span>₹{totalPrice.toFixed(0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
