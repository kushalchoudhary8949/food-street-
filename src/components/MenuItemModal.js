import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
export const MenuItemModal = ({ item, onClose, onAddToCart, }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedAddonIds, setSelectedAddonIds] = useState([]);
    if (!item)
        return null;
    const toggleAddon = (addonId) => {
        if (selectedAddonIds.includes(addonId)) {
            setSelectedAddonIds(selectedAddonIds.filter(id => id !== addonId));
        }
        else {
            setSelectedAddonIds([...selectedAddonIds, addonId]);
        }
    };
    const selectedAddons = (item.addons || []).filter(a => selectedAddonIds.includes(a.id));
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = (item.price + addonsTotal) * quantity;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isAvailableToday = !item.availableOnDays || item.availableOnDays.length === 0 || item.availableOnDays.includes(today);
    // If any selected addon is non-veg, the customised item becomes non-veg
    const hasNonVegAddon = selectedAddons.some(a => a.isVeg === false);
    const effectiveIsVeg = item.isVeg && !hasNonVegAddon;
    const handleConfirm = () => {
        if (!isAvailableToday)
            return;
        // Pass item with effectiveIsVeg state so cart and orders reflect non-veg correctly
        const configuredItem = {
            ...item,
            isVeg: effectiveIsVeg,
        };
        onAddToCart(configuredItem, quantity, selectedAddons);
        onClose();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200", children: _jsxs("div", { className: "w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300", children: [_jsxs("div", { className: "relative w-full h-56 bg-gray-100 shrink-0", children: [item.image && (_jsx("img", { src: item.image, alt: item.name, className: "w-full h-full object-cover", onError: (e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';
                            } })), _jsx("button", { onClick: onClose, className: "absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs text-gray-800 flex items-center justify-center hover:bg-white shadow-md transition-all", children: _jsx(X, { className: "w-5 h-5" }) }), _jsx("div", { className: "absolute top-4 left-4", children: _jsxs("span", { className: `inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors duration-200 ${effectiveIsVeg ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-300'}`, children: [_jsx("span", { className: `w-2 h-2 rounded-full ${effectiveIsVeg ? 'bg-emerald-600' : 'bg-red-600'}` }), _jsx("span", { children: effectiveIsVeg ? 'Veg' : 'Non-Veg' })] }) })] }), _jsxs("div", { className: "p-6 overflow-y-auto space-y-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("h3", { className: "text-xl font-extrabold text-gray-900 leading-snug", children: item.name }), _jsxs("span", { className: "text-lg font-black text-gray-900 shrink-0 ml-3", children: ["\u20B9", item.price.toFixed(0)] })] }), !isAvailableToday && (_jsxs("div", { className: "mt-3 inline-flex rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700", children: ["Only available on ", item.availableOnDays?.join(', ')] })), _jsx("p", { className: "text-sm text-gray-600 mt-2.5 leading-relaxed", children: item.description })] }), item.addons && item.addons.length > 0 && (_jsxs("div", { className: "border-t border-gray-100 pt-4", children: [_jsx("h4", { className: "text-sm font-bold text-gray-900 mb-1", children: "Customise Your Dish" }), _jsx("p", { className: "text-xs text-gray-500 mb-3", children: "Select your favorite toppings and options" }), _jsx("div", { className: "space-y-2", children: item.addons.map((addon) => {
                                        const isChecked = selectedAddonIds.includes(addon.id);
                                        const isAddonNonVeg = addon.isVeg === false;
                                        return (_jsxs("div", { onClick: () => toggleAddon(addon.id), className: `flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isChecked ? 'border-red-500 bg-red-50/40' : 'border-gray-200 hover:border-gray-300'}`, children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `w-5 h-5 rounded-md border flex items-center justify-center ${isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 bg-white'}`, children: isChecked && _jsx(Check, { className: "w-3.5 h-3.5 stroke-[3]" }) }), isAddonNonVeg ? (_jsx("span", { className: "w-3.5 h-3.5 border border-red-600 flex items-center justify-center rounded-xs shrink-0", title: "Non-Veg", children: _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-600" }) })) : addon.isVeg === true ? (_jsx("span", { className: "w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center rounded-xs shrink-0", title: "Veg", children: _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-600" }) })) : null, _jsx("span", { className: "text-xs sm:text-sm font-semibold text-gray-800", children: addon.name }), isAddonNonVeg && (_jsx("span", { className: "text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200", children: "Non-Veg" }))] }), _jsxs("span", { className: "text-xs sm:text-sm font-bold text-gray-900", children: ["+\u20B9", addon.price.toFixed(0)] })] }, addon.id));
                                    }) })] }))] }), _jsxs("div", { className: "p-4 sm:p-5 bg-white border-t border-gray-100 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center border border-gray-200 rounded-2xl p-1 bg-gray-50 shrink-0", children: [_jsx("button", { onClick: () => setQuantity(Math.max(1, quantity - 1)), className: "w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all", children: _jsx(Minus, { className: "w-3.5 h-3.5" }) }), _jsx("span", { className: "w-8 text-center text-sm font-bold text-gray-900", children: quantity }), _jsx("button", { onClick: () => setQuantity(quantity + 1), className: "w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all", children: _jsx(Plus, { className: "w-3.5 h-3.5" }) })] }), _jsxs("button", { id: "add-item-modal-btn", onClick: handleConfirm, disabled: !isAvailableToday, className: `flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all ${isAvailableToday
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`, children: [_jsx("span", { children: isAvailableToday ? 'Add Item' : 'Unavailable' }), _jsxs("span", { children: ["\u20B9", totalPrice.toFixed(0)] })] })] })] }) }));
};
