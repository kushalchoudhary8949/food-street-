/**
 * @file CartDrawer.js
 * @module components/CartDrawer
 * @description
 * Slide-over Cart Drawer and Checkout Flow for FoodZa.
 * 
 * Architectural Role:
 * - Provides the customer with a comprehensive summary of items currently added to their cart.
 * - Groups cart items by merchant/store and applies store-specific discount rules via `utils/discount.js`.
 * - Validates operational constraints prior to order placement:
 *   1. Store operational hours / order timing window (`getOrderWindowStatus`).
 *   2. Valid delivery destination selection (`currentAddress`).
 *   3. Mandatory non-cancellation acknowledgement toggle.
 *   4. Double-submission prevention via `isPlacing` lock.
 * - Computes dynamic order financials:
 *   - `itemTotal`: Sum of item base prices + selected addon modifications.
 *   - `containerCharge`: Quantity-scaled packaging charge per merchant.
 *   - `taxesAndPacking`: 5% GST and packaging fee.
 *   - `deliveryFee`: Fixed platform delivery fee (₹20).
 *   - `storeDiscount`: Automatically deducted store-level discounts if minimum order value (MOV) is satisfied.
 *   - `selectedTip`: Optional gratuity for the delivery driver (₹0, ₹20, ₹30, ₹50, ₹100).
 *   - `grandTotal`: Final payable amount.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls drawer visibility modal backdrop.
 * @param {Function} props.onClose - Dismisses the cart drawer.
 * @param {Array<Object>} props.cartItems - Array of cart item entities with nested store, item, and selectedAddons.
 * @param {Object} props.currentAddress - Customer's currently selected hostel/room delivery address.
 * @param {Function} props.onOpenLocationModal - Opens the address switcher modal.
 * @param {Function} props.onUpdateQuantity - Callback modifying line-item quantity (+1 / -1 / remove).
 * @param {Function} props.onClearCart - Empties all items from the active cart.
 * @param {number} [props.containerChargePerItem=0] - Container packaging fee per unit item.
 * @param {Function} props.onPlaceOrder - Callback executing order dispatch in `App.js`.
 */

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight, MapPin } from 'lucide-react';
import { isOrderWindowOpen, getOrderWindowStatus } from '../utils/orderTiming';
import { getStoreDiscount } from '../utils/discount';

export const CartDrawer = ({ isOpen, onClose, cartItems, currentAddress, onOpenLocationModal, onUpdateQuantity, onClearCart, containerChargePerItem = 0, onPlaceOrder, }) => {
    // -------------------------------------------------------------
    // Local Order Configuration State
    // -------------------------------------------------------------
    const [selectedTip, setSelectedTip] = useState(20);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('upi');
    const [isCancellationConfirmed, setIsCancellationConfirmed] = useState(false);
    const [isPlacing, setIsPlacing] = useState(false);
    const currentStore = cartItems[0]?.store;

    if (!isOpen)
        return null;

    // -------------------------------------------------------------
    // Financial Breakdown & Store Discount Computations
    // -------------------------------------------------------------
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
    storeGroups.forEach(group => {
        const discount = getStoreDiscount(group.store);
        if (discount && group.itemsTotal >= discount.minOrder) {
            storeDiscount += discount.amount;
        }
    });

    const grandTotal = Math.max(0, itemTotal + containerCharge + deliveryFee + taxesAndPacking + selectedTip - storeDiscount);

    /**
     * Executes client-side validation and initiates order dispatch.
     * Validates:
     * 1. Store operational timing window.
     * 2. Active delivery address selection.
     * 3. Non-cancellation agreement acknowledgement.
     * 4. Double-click concurrency lock (`isPlacing`).
     */
    const handleCheckout = () => {
        if (cartItems.length === 0)
            return;

        // Validation 1: Ensure store is currently accepting orders based on its operating hours
        const windowStatus = getOrderWindowStatus(currentStore?.id, undefined, currentStore);
        if (!windowStatus.isOpen) {
            alert(windowStatus.message);
            return;
        }

        // Validation 2: Ensure customer has specified a hostel room delivery address
        if (currentAddress.id === 'addr-none') {
            alert('Please add a delivery address before placing an order.');
            onOpenLocationModal();
            return;
        }

        // Validation 3: Ensure customer explicitly accepted the order finality policy
        if (!isCancellationConfirmed) {
            alert('Please confirm that the order cannot be cancelled after it is placed.');
            return;
        }

        // Validation 4: Double-submission prevention
        if (isPlacing) return;
        setIsPlacing(true);

        try {
            // Dispatch payload up to App.js `handlePlaceOrder`
            onPlaceOrder({
                tip: selectedTip,
                discount: storeDiscount,
                couponCode: storeDiscount > 0 ? (storeGroups.map(g => getStoreDiscount(g.store)?.couponCode).filter(Boolean).join(',') || 'DISCOUNT') : '',
                instructions: deliveryNote,
                paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online',
                cancellationConfirmed: isCancellationConfirmed,
            });
        } finally {
            // Reset placing lock after brief window
            setTimeout(() => setIsPlacing(false), 2500);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200", children: _jsxs("div", { className: "w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white", children: [_jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center", children: _jsx(ShoppingBag, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-gray-900", children: "Your Cart" }), cartItems.length > 0 && (_jsx("p", { className: "text-xs text-gray-500 font-medium", children: new Set(cartItems.map(ci => ci.store.id)).size === 1
                                                ? `From ${cartItems[0].store.name}`
                                                : `From ${new Set(cartItems.map(ci => ci.store.id)).size} Stores` }))] })] }), _jsx("button", { onClick: onClose, className: "p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50", children: cartItems.length === 0 ? (_jsxs("div", { className: "py-12 text-center space-y-3", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto", children: _jsx(ShoppingBag, { className: "w-8 h-8" }) }), _jsx("h4", { className: "text-base font-bold text-gray-800", children: "Your cart is empty" }), _jsx("p", { className: "text-xs text-gray-500 max-w-xs mx-auto", children: "Explore delicious meals from our featured stores and add them here!" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-2 bg-red-50 text-red-600 rounded-xl", children: _jsx(MapPin, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsxs("span", { className: "text-xs font-bold text-gray-900 block", children: ["Deliver to ", currentAddress.label] }), _jsxs("span", { className: "text-[11px] text-gray-500 line-clamp-1", children: [currentAddress.addressLine, ", ", currentAddress.locality] })] })] }), _jsx("button", { onClick: onOpenLocationModal, className: "text-xs font-bold text-red-600 hover:underline shrink-0 pl-2", children: "Change" })] }), _jsxs("div", { className: "bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between pb-2 border-b border-gray-100", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-gray-500", children: "Order Items" }), _jsx("button", { onClick: onClearCart, className: "text-xs text-red-600 hover:text-red-700 font-semibold", children: "Clear All" })] }), Object.values(cartItems.reduce((acc, ci) => {
                                        const key = ci.store.id;
                                        if (!acc[key])
                                            acc[key] = { store: ci.store, items: [] };
                                        acc[key].items.push(ci);
                                        return acc;
                                    }, {})).map((group) => (_jsxs("div", { className: "bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3 mb-4", children: [_jsx("div", { className: "flex items-center justify-between pb-2 border-b border-gray-100", children: _jsxs("span", { className: "text-xs font-bold uppercase tracking-wider text-gray-500", children: ["From ", group.store.name] }) }), group.items.map((ci) => {
                                                const addonsSum = ci.selectedAddons.reduce((s, a) => s + a.price, 0);
                                                const singlePrice = ci.item.price + addonsSum;
                                                return (_jsxs("div", { className: "flex items-start justify-between py-2 border-b border-gray-50 last:border-0", children: [_jsxs("div", { className: "space-y-0.5 flex-1 pr-2", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("span", { className: `w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${ci.item.isVeg ? 'border-emerald-600' : 'border-red-600'}`, children: _jsx("span", { className: `w-1.5 h-1.5 rounded-full ${ci.item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}` }) }), _jsx("span", { className: "text-xs sm:text-sm font-bold text-gray-900", children: ci.item.name })] }), ci.selectedAddons.length > 0 && (_jsxs("p", { className: "text-[11px] text-gray-500 pl-5", children: ["+ ", ci.selectedAddons.map((a) => a.name).join(', ')] })), _jsxs("span", { className: "text-xs font-semibold text-gray-700 block pl-5", children: ["\u20B9", (singlePrice * ci.quantity).toFixed(0)] })] }), _jsxs("div", { className: "flex items-center bg-gray-100 rounded-xl p-0.5 shrink-0", children: [_jsx("button", { onClick: () => onUpdateQuantity(ci.id, -1), className: "w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors", children: _jsx(Minus, { className: "w-3 h-3" }) }), _jsx("span", { className: "w-6 text-center text-xs font-bold", children: ci.quantity }), _jsx("button", { onClick: () => onUpdateQuantity(ci.id, 1), className: "w-6 h-6 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors", children: _jsx(Plus, { className: "w-3 h-3" }) })] })] }, ci.id));
                                            })] }, group.store.id)))] }), _jsxs("div", { className: "bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5", children: [_jsx("span", { className: "text-xs font-bold text-gray-900 block", children: "Tip your delivery partner" }), _jsx("p", { className: "text-[11px] text-gray-500", children: "100% of the tip goes directly to your driver" }), _jsx("div", { className: "flex items-center gap-2", children: [0, 20, 30, 50, 100].map((amount) => (_jsx("button", { onClick: () => setSelectedTip(amount), className: `flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTip === amount
                                                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: amount === 0 ? 'No tip' : `₹${amount}` }, amount))) })] }), _jsxs("div", { className: "bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2.5", children: [_jsx("span", { className: "text-xs font-bold text-gray-900 block", children: "Select Payment Method" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: [
                                            { id: 'upi', label: 'UPI / GPay / PhonePe' },
                                            { id: 'cod', label: 'Cash on Delivery' },
                                        ].map((pm) => (_jsx("button", { onClick: () => setPaymentMethod(pm.id), className: `py-3 px-3 text-center rounded-xl text-xs font-bold border transition-all ${paymentMethod === pm.id
                                                ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`, children: pm.label }, pm.id))) })] }), storeGroups.some(g => Boolean(getStoreDiscount(g.store))) && (_jsxs("div", { className: "space-y-2", children: storeGroups.map(group => {
                                        const discount = getStoreDiscount(group.store);
                                        if (!discount) return null;
                                        if (group.itemsTotal < discount.minOrder) {
                                            const remaining = (discount.minOrder - group.itemsTotal).toFixed(0);
                                            return (_jsxs("div", { key: group.store.id, className: "bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-center justify-between font-medium shadow-xs", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base", children: "🏷️" }), _jsxs("span", { children: ["Add ", _jsxs("strong", { children: ["\u20B9", remaining] }), " more from ", _jsx("strong", { children: group.store.name }), " to get ", _jsx("strong", { children: `\u20B9${discount.amount} OFF` }), "!"] })] })] }));
                                        }
                                        return (_jsxs("div", { key: group.store.id, className: "bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-center justify-between font-medium shadow-xs", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base", children: "🎉" }), _jsxs("span", { children: [_jsx("strong", { children: `\u20B9${discount.amount} Discount Applied` }), " on ", group.store.name, "!"] })] }), _jsx("span", { className: "font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-xs", children: `-\u20B9${discount.amount}` })] }));
                                    }) })), _jsxs("div", { className: "bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2 text-xs", children: [_jsx("h4", { className: "font-bold text-gray-900 pb-1 border-b border-gray-100", children: "Bill Details" }), _jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Item Total" }), _jsxs("span", { children: ["\u20B9", itemTotal.toFixed(0)] })] }), storeDiscount > 0 && (_jsxs("div", { className: "flex justify-between items-center text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { children: "🏷️" }), _jsx("span", { children: "Store Offer Discount" })] }), _jsxs("span", { className: "font-black", children: ["-\u20B9", storeDiscount.toFixed(0)] })] })), _jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Taxes" }), _jsxs("span", { children: ["\u20B9", taxesAndPacking.toFixed(0)] })] }), _jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Platform Fee" }), _jsxs("span", { children: ["\u20B9", deliveryFee] })] }), selectedTip > 0 && (_jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Delivery Partner Tip" }), _jsxs("span", { children: ["\u20B9", selectedTip] })] })), containerCharge > 0 && (_jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsxs("span", { children: ["Container Charges ", _jsxs("span", { className: "text-gray-400", children: ["(\u20B9", containerChargePerItem, " \u00D7 ", totalQuantity, ")"] })] }), _jsxs("span", { children: ["\u20B9", containerCharge] })] })), _jsxs("div", { className: "flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100", children: [_jsx("span", { children: "To Pay" }), _jsxs("span", { className: "text-red-600", children: ["\u20B9", grandTotal.toFixed(0)] })] })] }), _jsxs("label", { className: "flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-xs", children: [_jsx("input", { type: "checkbox", checked: isCancellationConfirmed, onChange: (e) => setIsCancellationConfirmed(e.target.checked), className: "mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" }), _jsx("span", { className: "text-[11px] font-medium text-gray-700 leading-relaxed", children: "I understand this order cannot be cancelled after it is placed." })] })] })) }), cartItems.length > 0 && (_jsxs("div", { className: "p-4 sm:p-5 bg-white border-t border-gray-100 space-y-2", children: [(() => {
                            const ws = getOrderWindowStatus(currentStore?.id, undefined, currentStore);
                            return (_jsxs("div", { className: `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${ws.isOpen
                                    ? 'bg-green-50 border border-green-200 text-green-800'
                                    : 'bg-red-50 border border-red-200 text-red-700'}`, children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: `w-2 h-2 rounded-full flex-shrink-0 ${ws.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}` }), _jsx("span", { children: ws.isOpen ? 'Orders open now' : ws.isClosedForToday ? 'Orders closed' : `Orders closed · Opens at ${ws.opensAt}` })] }), ws.isOpen || !ws.isClosedForToday ? (_jsxs("span", { className: "opacity-70 ml-2 whitespace-nowrap", children: ["\u23F0 ", ws.opensAt, " \u2013 ", ws.closesAt] })) : null] }));
                        })(), _jsxs("button", { id: "place-order-checkout-btn", onClick: handleCheckout, disabled: isPlacing || !isCancellationConfirmed || !getOrderWindowStatus(currentStore?.id, undefined, currentStore).isOpen, className: "w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-base flex items-center justify-between shadow-lg shadow-red-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600", children: [_jsxs("div", { className: "text-left", children: [_jsx("span", { className: "text-xs uppercase tracking-wider opacity-90 block font-semibold", children: "Total" }), _jsxs("span", { className: "text-lg", children: ["\u20B9", grandTotal.toFixed(0)] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { children: isPlacing ? "Placing..." : "Place Order" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })] })] }))] }) }));
};
