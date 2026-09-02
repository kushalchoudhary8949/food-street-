import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { CartItem, UserAddress } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currentAddress: UserAddress;
  onOpenLocationModal: () => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onClearCart: () => void;
  onPlaceOrder: (orderSummary: {
    tip: number;
    discount: number;
    couponCode: string;
    instructions: string;
    paymentMethod: string;
    cancellationConfirmed: boolean;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  currentAddress,
  onOpenLocationModal,
  onUpdateQuantity,
  onClearCart,
  onPlaceOrder,
}) => {
  const [selectedTip, setSelectedTip] = useState<number>(20);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi');
  const [isCancellationConfirmed, setIsCancellationConfirmed] = useState(false);

  const isOrderWindowOpen = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 12 && hour < 22;
  };

  if (!isOpen) return null;

  // Calculate bill
  const itemTotal = cartItems.reduce((sum, ci) => {
    const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
    return sum + (ci.item.price + addonsCost) * ci.quantity;
  }, 0);

  const deliveryFee = 15;
  const taxesAndPacking = Number((itemTotal * 0.05).toFixed(2));
  const grandTotal = Math.max(0, itemTotal + deliveryFee + taxesAndPacking + selectedTip);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!isOrderWindowOpen()) {
      alert('Orders are open only from 12:00 PM to 10:00 PM.');
      return;
    }
    if (currentAddress.id === 'addr-none') {
      alert('Please add a delivery address before placing an order.');
      onOpenLocationModal();
      return;
    }
    if (!isCancellationConfirmed) {
      alert('Please confirm that the order cannot be cancelled after it is placed.');
      return;
    }
    onPlaceOrder({
      tip: selectedTip,
      discount: 0,
      couponCode: '',
      instructions: deliveryNote,
      paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online',
      cancellationConfirmed: isCancellationConfirmed,
    });
  };

  const currentStore = cartItems[0]?.store;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Cart</h3>
              {currentStore && (
                <p className="text-xs text-gray-500 font-medium">From {currentStore.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-800">Your cart is empty</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Explore delicious meals from our featured stores and add them here!
              </p>
            </div>
          ) : (
            <>
              {/* Delivery Address Pill */}
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Deliver to {currentAddress.label}
                    </span>
                    <span className="text-[11px] text-gray-500 line-clamp-1">
                      {currentAddress.addressLine}, {currentAddress.locality}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onOpenLocationModal}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0 pl-2"
                >
                  Change
                </button>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Order Items</span>
                  <button
                    onClick={onClearCart}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                {cartItems.map((ci) => {
                  const addonsSum = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
                  const singlePrice = ci.item.price + addonsSum;
                  return (
                    <div key={ci.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${ci.item.isVeg ? 'border-emerald-600' : 'border-red-600'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ci.item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">{ci.item.name}</span>
                        </div>
                        {ci.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-gray-500 pl-5">
                            + {ci.selectedAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        <span className="text-xs font-semibold text-gray-700 block pl-5">
                          ₹{(singlePrice * ci.quantity).toFixed(0)}
                        </span>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shrink-0">
                        <button
                          onClick={() => onUpdateQuantity(ci.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{ci.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(ci.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                Orders are accepted only until 10:00 PM.
              </div>

              {/* Delivery Tip */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5">
                <span className="text-xs font-bold text-gray-900 block">
                  Tip your delivery partner
                </span>
                <p className="text-[11px] text-gray-500">100% of the tip goes directly to your driver</p>
                <div className="flex items-center gap-2">
                  {[0, 20, 30, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedTip(amount)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTip === amount
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {amount === 0 ? 'No tip' : `₹${amount}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5">
                <span className="text-xs font-bold text-gray-900 block">Select Payment Method</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'upi', label: 'UPI / GPay / PhonePe' },
                    { id: 'cod', label: 'Cash on Delivery' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`py-3 px-3 text-center rounded-xl text-xs font-bold border transition-all ${paymentMethod === pm.id
                        ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Details */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2 text-xs">
                <h4 className="font-bold text-gray-900 pb-1 border-b border-gray-100">Bill Details</h4>
                <div className="flex justify-between text-gray-600">
                  <span>Item Total</span>
                  <span>₹{itemTotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes</span>
                  <span>₹{taxesAndPacking.toFixed(0)}</span>
                </div>
                {selectedTip > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Partner Tip</span>
                    <span>₹{selectedTip}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                  <span>To Pay</span>
                  <span className="text-red-600">₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-xs">
                <input
                  type="checkbox"
                  checked={isCancellationConfirmed}
                  onChange={(e) => setIsCancellationConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-[11px] font-medium text-gray-700 leading-relaxed">
                  I understand this order cannot be cancelled after it is placed.
                </span>
              </label>
            </>
          )}
        </div>

        {/* Place Order CTA */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 bg-white border-t border-gray-100">
            <button
              id="place-order-checkout-btn"
              onClick={handleCheckout}
              disabled={!isCancellationConfirmed || !isOrderWindowOpen()}
              className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-base flex items-center justify-between shadow-lg shadow-red-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
            >
              <div className="text-left">
                <span className="text-xs uppercase tracking-wider opacity-90 block font-semibold">Total</span>
                <span className="text-lg">₹{grandTotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Place Order</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
