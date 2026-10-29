/**
 * @file CartDrawer.js
 * @module components/CartDrawer
 * @description
 * Slide-over Cart Drawer and Checkout Flow for FoodZa.
 * 
 * Features:
 * - Grouped cart items by merchant
 * - Dynamic store discounts and financial breakdowns
 * - Campus Delivery Destination Display (Hostel, Room No, Block, Floor, Phone)
 * - Special delivery instructions entry
 * - Non-cancellation agreement acknowledgement
 * - Double-submission prevention lock
 * - Validation of store operating hours and mandatory delivery details
 */

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight, MapPin, Building, ShieldCheck, MessageSquare } from 'lucide-react';
import { isOrderWindowOpen, getOrderWindowStatus } from '../utils/orderTiming.js';
import { getStoreDiscount } from '../utils/discount.js';

export const CartDrawer = ({
  isOpen,
  onClose,
  cartItems = [],
  currentAddress = {},
  currentUser = null,
  onOpenLocationModal,
  onOpenAuthModal,
  onUpdateQuantity,
  onClearCart,
  containerChargePerItem = 0,
  onPlaceOrder,
}) => {
  // Local Order Configuration State
  const [selectedTip, setSelectedTip] = useState(20);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isCancellationConfirmed, setIsCancellationConfirmed] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const currentStore = cartItems[0]?.store;

  if (!isOpen) return null;

  // Financial Breakdown & Store Discount Computations
  const itemTotal = cartItems.reduce((sum, ci) => {
    const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
    return sum + (ci.item.price + addonsCost) * ci.quantity;
  }, 0);
  const totalQuantity = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const containerCharge = containerChargePerItem > 0 ? totalQuantity * containerChargePerItem : 0;
  const taxesAndPacking = Number((itemTotal * 0.05).toFixed(2));
  const deliveryFee = 20;

  const storeGroupsMap = cartItems.reduce((acc, ci) => {
    const key = ci.store.id;
    if (!acc[key]) acc[key] = { store: ci.store, itemsTotal: 0, items: [] };
    const addonsCost = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
    acc[key].itemsTotal += (ci.item.price + addonsCost) * ci.quantity;
    acc[key].items.push(ci);
    return acc;
  }, {});
  const storeGroups = Object.values(storeGroupsMap);

  let storeDiscount = 0;
  storeGroups.forEach((group) => {
    const discount = getStoreDiscount(group.store);
    if (discount && group.itemsTotal >= discount.minOrder) {
      storeDiscount += discount.amount;
    }
  });

  const grandTotal = Math.max(0, itemTotal + containerCharge + deliveryFee + taxesAndPacking + selectedTip - storeDiscount);

  // Derive active delivery presentation fields
  const displayHostel = currentAddress.hostelName || currentAddress.hostel_name || currentUser?.hostelName || '';
  const displayRoom = currentAddress.roomNo || currentAddress.room_no || currentUser?.roomNo || '';
  const displayName = currentAddress.name || currentUser?.name || '';
  const displayPhone = currentAddress.phone || currentUser?.phone || '';

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // Validation 1: Store operating window
    const windowStatus = getOrderWindowStatus(currentStore?.id, undefined, currentStore);
    if (!windowStatus.isOpen) {
      alert(windowStatus.message);
      return;
    }

    // Validation 2: Ensure valid delivery address is selected
    if (currentAddress.id === 'addr-none') {
      alert('Please add a delivery address before placing an order.');
      onOpenLocationModal();
      return;
    }

    // Validation 3: Ensure hostel and room number are present
    if (!displayHostel && !currentAddress.addressLine && !currentAddress.address_line) {
      alert('Please specify your hostel name in the delivery address.');
      onOpenLocationModal();
      return;
    }

    if (!displayRoom && !currentAddress.addressLine && !currentAddress.address_line) {
      alert('Please specify your room number for campus delivery.');
      onOpenLocationModal();
      return;
    }

    // Validation 4: Cancellation agreement
    if (!isCancellationConfirmed) {
      alert('Please confirm that the order cannot be cancelled after it is placed.');
      return;
    }

    // Validation 5: Double-submission prevention
    if (isPlacing) return;
    setIsPlacing(true);

    try {
      onPlaceOrder({
        tip: selectedTip,
        discount: storeDiscount,
        couponCode:
          storeDiscount > 0
            ? storeGroups
                .map((g) => getStoreDiscount(g.store)?.couponCode)
                .filter(Boolean)
                .join(',') || 'DISCOUNT'
            : '',
        instructions: deliveryNote.trim() || currentAddress.instructions || '',
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online',
        cancellationConfirmed: isCancellationConfirmed,
        addressId: currentAddress.id,
        hostel: displayHostel,
        roomNo: displayRoom,
        block: currentAddress.block || currentUser?.block || '',
        floor: currentAddress.floor || currentUser?.floor || '',
        name: displayName,
        contact: displayPhone,
      });
    } finally {
      setTimeout(() => setIsPlacing(false), 2500);
    }
  };

  return _jsx('div', {
    id: 'cart-drawer-overlay',
    className:
      'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200',
    children: _jsxs('div', {
      id: 'cart-drawer-content',
      className:
        'w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300',
      children: [
        // Drawer Header
        _jsxs('div', {
          className: 'flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white',
          children: [
            _jsxs('div', {
              className: 'flex items-center space-x-2.5',
              children: [
                _jsx('div', {
                  className: 'w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center',
                  children: _jsx(ShoppingBag, { className: 'w-5 h-5' }),
                }),
                _jsxs('div', {
                  children: [
                    _jsx('h3', { className: 'text-lg font-bold text-gray-900', children: 'Your Cart' }),
                    cartItems.length > 0 &&
                      _jsx('p', {
                        className: 'text-xs text-gray-500 font-medium',
                        children:
                          new Set(cartItems.map((ci) => ci.store.id)).size === 1
                            ? `From ${cartItems[0].store.name}`
                            : `From ${new Set(cartItems.map((ci) => ci.store.id)).size} Stores`,
                      }),
                  ],
                }),
              ],
            }),
            _jsx('button', {
              id: 'close-cart-drawer-btn',
              onClick: onClose,
              className: 'p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors',
              children: _jsx(X, { className: 'w-5 h-5' }),
            }),
          ],
        }),

        // Drawer Scrollable Body
        _jsx('div', {
          className: 'p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/50',
          children:
            cartItems.length === 0
              ? _jsxs('div', {
                  className: 'py-12 text-center space-y-3',
                  children: [
                    _jsx('div', {
                      className: 'w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto',
                      children: _jsx(ShoppingBag, { className: 'w-8 h-8' }),
                    }),
                    _jsx('h4', { className: 'text-base font-bold text-gray-800', children: 'Your cart is empty' }),
                    _jsx('p', {
                      className: 'text-xs text-gray-500 max-w-xs mx-auto',
                      children: 'Explore delicious meals from our campus stores and add them here!',
                    }),
                  ],
                })
              : _jsxs(_Fragment, {
                  children: [
                    // Delivery Destination Card with Hostel & Room
                    _jsxs('div', {
                      id: 'checkout-delivery-card',
                      className: 'bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-start justify-between',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-start space-x-3 flex-1 pr-2',
                          children: [
                            _jsx('div', {
                              className: 'p-2 bg-red-50 text-red-600 rounded-xl mt-0.5 shrink-0',
                              children: _jsx(MapPin, { className: 'w-4 h-4' }),
                            }),
                            _jsxs('div', {
                              className: 'space-y-0.5',
                              children: [
                                _jsxs('div', {
                                  className: 'flex items-center space-x-2',
                                  children: [
                                    _jsxs('span', {
                                      className: 'text-xs font-black text-gray-900',
                                      children: ['Deliver to: ', currentAddress.label || 'Hostel'],
                                    }),
                                    currentUser &&
                                      _jsxs('span', {
                                        className:
                                          'px-2 py-0.2 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1',
                                        children: [_jsx(ShieldCheck, { className: 'w-2.5 h-2.5' }), _jsx('span', { children: 'VERIFIED' })],
                                      }),
                                  ],
                                }),
                                (displayHostel || displayRoom) &&
                                  _jsx('p', {
                                    className: 'text-xs font-black text-red-600',
                                    children: [displayRoom ? `Room ${displayRoom}` : null, displayHostel].filter(Boolean).join(', '),
                                  }),
                                displayName &&
                                  _jsxs('p', {
                                    className: 'text-[11px] font-bold text-gray-800',
                                    children: ['Recipient: ', displayName],
                                  }),
                                _jsx('p', {
                                  className: 'text-[11px] text-gray-500 line-clamp-1',
                                  children: currentAddress.addressLine || currentAddress.address_line || 'Campus',
                                }),
                                displayPhone &&
                                  _jsxs('p', {
                                    className: 'text-[11px] font-semibold text-gray-600',
                                    children: ['📞 ', displayPhone],
                                  }),
                              ],
                            }),
                          ],
                        }),
                        _jsx('button', {
                          id: 'change-delivery-address-btn',
                          onClick: onOpenLocationModal,
                          className: 'text-xs font-black text-red-600 hover:underline shrink-0 pl-2 pt-1',
                          children: 'Change',
                        }),
                      ],
                    }),

                    // Guest Login Prompt (if not authenticated)
                    !currentUser &&
                      onOpenAuthModal &&
                      _jsxs('div', {
                        className:
                          'bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs',
                        children: [
                          _jsxs('div', {
                            className: 'flex items-center space-x-2 text-emerald-900',
                            children: [
                              _jsx(MessageSquare, { className: 'w-4 h-4 text-emerald-600 shrink-0' }),
                              _jsx('span', {
                                className: 'font-semibold',
                                children: 'Optional: Sign in with WhatsApp for saved addresses & updates.',
                              }),
                            ],
                          }),
                          _jsx('button', {
                            onClick: onOpenAuthModal,
                            className: 'px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shrink-0 shadow-xs transition-all',
                            children: 'Sign In',
                          }),
                        ],
                      }),

                    // Order Items by Store
                    _jsxs('div', {
                      className: 'bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-center justify-between pb-2 border-b border-gray-100',
                          children: [
                            _jsx('span', {
                              className: 'text-xs font-bold uppercase tracking-wider text-gray-500',
                              children: 'Order Items',
                            }),
                            _jsx('button', {
                              onClick: onClearCart,
                              className: 'text-xs text-red-600 hover:text-red-700 font-semibold',
                              children: 'Clear All',
                            }),
                          ],
                        }),
                        storeGroups.map((group) =>
                          _jsxs(
                            'div',
                            {
                              className: 'space-y-3 mb-2',
                              children: [
                                _jsx('div', {
                                  className: 'text-xs font-black text-gray-700 uppercase tracking-wide',
                                  children: group.store.name,
                                }),
                                group.items.map((ci) => {
                                  const addonsSum = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
                                  const singlePrice = ci.item.price + addonsSum;
                                  return _jsxs(
                                    'div',
                                    {
                                      className: 'flex items-start justify-between py-2 border-b border-gray-50 last:border-0',
                                      children: [
                                        _jsxs('div', {
                                          className: 'space-y-0.5 flex-1 pr-2',
                                          children: [
                                            _jsxs('div', {
                                              className: 'flex items-center space-x-1.5',
                                              children: [
                                                _jsx('span', {
                                                  className: `w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${
                                                    ci.item.isVeg ? 'border-emerald-600' : 'border-red-600'
                                                  }`,
                                                  children: _jsx('span', {
                                                    className: `w-1.5 h-1.5 rounded-full ${
                                                      ci.item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                                    }`,
                                                  }),
                                                }),
                                                _jsx('span', {
                                                  className: 'text-xs sm:text-sm font-bold text-gray-900',
                                                  children: ci.item.name,
                                                }),
                                              ],
                                            }),
                                            ci.selectedAddons.length > 0 &&
                                              _jsxs('p', {
                                                className: 'text-[11px] text-gray-500 pl-5',
                                                children: ['+ ', ci.selectedAddons.map((a) => a.name).join(', ')],
                                              }),
                                            _jsxs('span', {
                                              className: 'text-xs font-semibold text-gray-700 block pl-5',
                                              children: ['₹', (singlePrice * ci.quantity).toFixed(0)],
                                            }),
                                          ],
                                        }),
                                        _jsxs('div', {
                                          className: 'flex items-center bg-gray-100 rounded-xl p-0.5 shrink-0',
                                          children: [
                                            _jsx('button', {
                                              onClick: () => onUpdateQuantity(ci.id, -1),
                                              className:
                                                'w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors',
                                              children: _jsx(Minus, { className: 'w-3 h-3' }),
                                            }),
                                            _jsx('span', {
                                              className: 'w-6 text-center text-xs font-bold',
                                              children: ci.quantity,
                                            }),
                                            _jsx('button', {
                                              onClick: () => onUpdateQuantity(ci.id, 1),
                                              className:
                                                'w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors',
                                              children: _jsx(Plus, { className: 'w-3 h-3' }),
                                            }),
                                          ],
                                        }),
                                      ],
                                    },
                                    ci.id
                                  );
                                }),
                              ],
                            },
                            group.store.id
                          )
                        ),
                      ],
                    }),

                    // Special Delivery Instructions Note
                    _jsxs('div', {
                      className: 'bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1.5',
                      children: [
                        _jsx('label', {
                          className: 'block text-xs font-bold text-gray-900',
                          children: 'Delivery Instructions (Optional)',
                        }),
                        _jsx('input', {
                          id: 'checkout-delivery-instructions-input',
                          type: 'text',
                          placeholder: 'e.g. Call when outside hostel gate, leave at reception...',
                          value: deliveryNote,
                          onChange: (e) => setDeliveryNote(e.target.value),
                          className:
                            'w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                        }),
                      ],
                    }),

                    // Tip Driver
                    _jsxs('div', {
                      className: 'bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5',
                      children: [
                        _jsx('span', { className: 'text-xs font-bold text-gray-900 block', children: 'Tip your delivery partner' }),
                        _jsx('p', { className: 'text-[11px] text-gray-500', children: '100% of the tip goes directly to your driver' }),
                        _jsx('div', {
                          className: 'flex items-center gap-2',
                          children: [0, 20, 30, 50, 100].map((amount) =>
                            _jsx(
                              'button',
                              {
                                onClick: () => setSelectedTip(amount),
                                className: `flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  selectedTip === amount
                                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`,
                                children: amount === 0 ? 'No tip' : `₹${amount}`,
                              },
                              amount
                            )
                          ),
                        }),
                      ],
                    }),

                    // Payment Method
                    _jsxs('div', {
                      className: 'bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5',
                      children: [
                        _jsx('span', { className: 'text-xs font-bold text-gray-900 block', children: 'Select Payment Method' }),
                        _jsx('div', {
                          className: 'grid grid-cols-2 gap-3',
                          children: [
                            { id: 'upi', label: 'UPI / GPay / PhonePe' },
                            { id: 'cod', label: 'Cash on Delivery' },
                          ].map((pm) =>
                            _jsx(
                              'button',
                              {
                                onClick: () => setPaymentMethod(pm.id),
                                className: `py-3 px-3 text-center rounded-xl text-xs font-bold border transition-all ${
                                  paymentMethod === pm.id
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`,
                                children: pm.label,
                              },
                              pm.id
                            )
                          ),
                        }),
                      ],
                    }),

                    // Store Offers
                    storeGroups.some((g) => Boolean(getStoreDiscount(g.store))) &&
                      _jsx('div', {
                        className: 'space-y-2',
                        children: storeGroups.map((group) => {
                          const discount = getStoreDiscount(group.store);
                          if (!discount) return null;
                          if (group.itemsTotal < discount.minOrder) {
                            const remaining = (discount.minOrder - group.itemsTotal).toFixed(0);
                            return _jsx(
                              'div',
                              {
                                className:
                                  'bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-center justify-between font-medium shadow-xs',
                                children: _jsxs('span', {
                                  className: 'flex items-center gap-2',
                                  children: [
                                    _jsx('span', { className: 'text-base', children: '🏷️' }),
                                    _jsxs('span', {
                                      children: [
                                        'Add ',
                                        _jsxs('strong', { children: ['₹', remaining] }),
                                        ' more from ',
                                        _jsx('strong', { children: group.store.name }),
                                        ' to get ',
                                        _jsx('strong', { children: `₹${discount.amount} OFF` }),
                                        '!',
                                      ],
                                    }),
                                  ],
                                }),
                              },
                              group.store.id
                            );
                          }
                          return _jsxs(
                            'div',
                            {
                              className:
                                'bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-center justify-between font-medium shadow-xs',
                              children: [
                                _jsxs('span', {
                                  className: 'flex items-center gap-2',
                                  children: [
                                    _jsx('span', { className: 'text-base', children: '🎉' }),
                                    _jsxs('span', {
                                      children: [
                                        _jsx('strong', { children: `₹${discount.amount} Discount Applied` }),
                                        ' on ',
                                        group.store.name,
                                        '!',
                                      ],
                                    }),
                                  ],
                                }),
                                _jsx('span', {
                                  className:
                                    'font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-xs',
                                  children: `-₹${discount.amount}`,
                                }),
                              ],
                            },
                            group.store.id
                          );
                        }),
                      }),

                    // Bill Details
                    _jsxs('div', {
                      className: 'bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2 text-xs',
                      children: [
                        _jsx('h4', { className: 'font-bold text-gray-900 pb-1 border-b border-gray-100', children: 'Bill Details' }),
                        _jsxs('div', {
                          className: 'flex justify-between text-gray-600',
                          children: [_jsx('span', { children: 'Item Total' }), _jsxs('span', { children: ['₹', itemTotal.toFixed(0)] })],
                        }),
                        storeDiscount > 0 &&
                          _jsxs('div', {
                            className:
                              'flex justify-between items-center text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200',
                            children: [
                              _jsxs('span', {
                                className: 'flex items-center gap-1.5',
                                children: [_jsx('span', { children: '🏷️' }), _jsx('span', { children: 'Store Offer Discount' })],
                              }),
                              _jsxs('span', { className: 'font-black', children: ['-₹', storeDiscount.toFixed(0)] }),
                            ],
                          }),
                        _jsxs('div', {
                          className: 'flex justify-between text-gray-600',
                          children: [_jsx('span', { children: 'Taxes' }), _jsxs('span', { children: ['₹', taxesAndPacking.toFixed(0)] })],
                        }),
                        _jsxs('div', {
                          className: 'flex justify-between text-gray-600',
                          children: [_jsx('span', { children: 'Platform Fee' }), _jsxs('span', { children: ['₹', deliveryFee] })],
                        }),
                        selectedTip > 0 &&
                          _jsxs('div', {
                            className: 'flex justify-between text-gray-600',
                            children: [_jsx('span', { children: 'Delivery Partner Tip' }), _jsxs('span', { children: ['₹', selectedTip] })],
                          }),
                        containerCharge > 0 &&
                          _jsxs('div', {
                            className: 'flex justify-between text-gray-600',
                            children: [
                              _jsxs('span', {
                                children: [
                                  'Container Charges ',
                                  _jsxs('span', {
                                    className: 'text-gray-400',
                                    children: ['(₹', containerChargePerItem, ' × ', totalQuantity, ')'],
                                  }),
                                ],
                              }),
                              _jsxs('span', { children: ['₹', containerCharge] }),
                            ],
                          }),
                        _jsxs('div', {
                          className: 'flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100',
                          children: [_jsx('span', { children: 'To Pay' }), _jsxs('span', { className: 'text-red-600', children: ['₹', grandTotal.toFixed(0)] })],
                        }),
                      ],
                    }),

                    // Non-cancellation agreement
                    _jsxs('label', {
                      className: 'flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-xs cursor-pointer',
                      children: [
                        _jsx('input', {
                          type: 'checkbox',
                          checked: isCancellationConfirmed,
                          onChange: (e) => setIsCancellationConfirmed(e.target.checked),
                          className: 'mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500',
                        }),
                        _jsx('span', {
                          className: 'text-[11px] font-medium text-gray-700 leading-relaxed',
                          children: 'I understand this order cannot be cancelled after it is placed.',
                        }),
                      ],
                    }),
                  ],
                }),
        }),

        // Checkout Button Footer
        cartItems.length > 0 &&
          _jsxs('div', {
            className: 'p-4 sm:p-5 bg-white border-t border-gray-100 space-y-2',
            children: [
              (() => {
                const ws = getOrderWindowStatus(currentStore?.id, undefined, currentStore);
                return _jsxs('div', {
                  className: `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                    ws.isOpen ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'
                  }`,
                  children: [
                    _jsxs('div', {
                      className: 'flex items-center space-x-2',
                      children: [
                        _jsx('span', {
                          className: `w-2 h-2 rounded-full flex-shrink-0 ${ws.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`,
                        }),
                        _jsx('span', {
                          children: ws.isOpen
                            ? 'Orders open now'
                            : ws.isClosedForToday
                            ? 'Orders closed'
                            : `Orders closed · Opens at ${ws.opensAt}`,
                        }),
                      ],
                    }),
                    ws.isOpen || !ws.isClosedForToday
                      ? _jsxs('span', {
                          className: 'opacity-70 ml-2 whitespace-nowrap',
                          children: ['⏰ ', ws.opensAt, ' – ', ws.closesAt],
                        })
                      : null,
                  ],
                });
              })(),
              _jsxs('button', {
                id: 'place-order-checkout-btn',
                onClick: handleCheckout,
                disabled:
                  isPlacing ||
                  !isCancellationConfirmed ||
                  !getOrderWindowStatus(currentStore?.id, undefined, currentStore).isOpen,
                className:
                  'w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-base flex items-center justify-between shadow-lg shadow-red-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600',
                children: [
                  _jsxs('div', {
                    className: 'text-left',
                    children: [
                      _jsx('span', {
                        className: 'text-xs uppercase tracking-wider opacity-90 block font-semibold',
                        children: 'Total',
                      }),
                      _jsxs('span', { className: 'text-lg', children: ['₹', grandTotal.toFixed(0)] }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center space-x-2',
                    children: [
                      _jsx('span', {
                        children: isPlacing ? 'Placing Order...' : 'Place Order',
                      }),
                      _jsx(ArrowRight, { className: 'w-5 h-5' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
      ],
    }),
  });
};
