import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, Search, Plus, Minus, Clock, Store as StoreIcon, AlertTriangle } from 'lucide-react';
import { GRADUATE_BIRYANI_ORDER_SLOTS } from '../utils/orderTiming';
import { getOrderWindowStatus } from '../utils/orderTiming';
export const StoreDetailModal = ({ store, isOpen, onClose, isFavorite, onToggleFavorite, cartItems, onOpenItemModal, onUpdateCartQuantity, onOpenCart, }) => {
    const hasOutlets = Boolean(store && store.outlets && store.outlets.length > 0);
    const [selectedOutletId, setSelectedOutletId] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [menuSearch, setMenuSearch] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [showGraduateMenu, setShowGraduateMenu] = useState(false);
    useEffect(() => {
        if (store) {
            if (store.outlets && store.outlets.length > 0) {
                setSelectedOutletId('select');
            }
            else {
                setSelectedOutletId('all');
            }
            setSelectedCategory('all');
            setMenuSearch('');
            setShowGraduateMenu(false);
        }
    }, [store?.id, isOpen]);
    if (!isOpen || !store)
        return null;
    const orderWindowStatus = getOrderWindowStatus(store.id);
    const currentOutlet = hasOutlets && selectedOutletId && selectedOutletId !== 'all' && selectedOutletId !== 'select'
        ? store.outlets?.find(o => o.id === selectedOutletId)
        : null;
    // Helper to find outlet for an item
    const getOutletForItem = (item) => {
        if (!hasOutlets)
            return undefined;
        return store.outlets?.find((o) => o.id === item.storeId);
    };
    // Cuisines display
    const cuisinesText = currentOutlet ? currentOutlet.cuisines.join(', ') : store.cuisines.join(', ');
    // Filter items by outlet first if outlets exist
    const outletFilteredItems = hasOutlets && selectedOutletId !== 'all' && selectedOutletId !== 'select'
        ? store.items.filter((item) => item.storeId === selectedOutletId)
        : store.items;
    const uniqueItems = outletFilteredItems.filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id || (candidate.name === item.name && candidate.isVeg === item.isVeg && candidate.storeId === item.storeId)) === index);
    // Compute available categories dynamically
    const availableCategories = currentOutlet
        ? currentOutlet.menuCategories
        : (hasOutlets && selectedOutletId !== 'all' && selectedOutletId !== 'select'
            ? Array.from(new Set(uniqueItems.map(i => i.category)))
            : store.menuCategories);
    // Filtered menu items
    const filteredItems = uniqueItems.filter((item) => {
        if (vegOnly && !item.isVeg)
            return false;
        if (selectedCategory !== 'all' && item.category !== selectedCategory)
            return false;
        if (menuSearch.trim()) {
            const q = menuSearch.toLowerCase();
            const matchName = item.name.toLowerCase().includes(q);
            const matchDesc = item.description.toLowerCase().includes(q);
            const outletName = getOutletForItem(item)?.name.toLowerCase() || '';
            if (!matchName && !matchDesc && !outletName.includes(q))
                return false;
        }
        return true;
    });
    // Calculate items in cart for this store (or its outlets)
    const storeCartItems = cartItems.filter(ci => ci.store.id === store.id || (store.outlets && store.outlets.some(o => o.id === ci.store.id)));
    const storeCartCount = storeCartItems.reduce((sum, ci) => sum + ci.quantity, 0);
    const storeCartSubtotal = storeCartItems.reduce((sum, ci) => sum + (ci.item.price + ci.selectedAddons.reduce((s, a) => s + a.price, 0)) * ci.quantity, 0);
    const getItemCountInCart = (itemId) => {
        return cartItems
            .filter(c => c.item.id === itemId)
            .reduce((acc, c) => acc + c.quantity, 0);
    };
    const handleHeaderBack = () => {
        if (hasOutlets && selectedOutletId !== 'select') {
            setSelectedOutletId('select');
            setSelectedCategory('all');
            setMenuSearch('');
        }
        else {
            onClose();
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center animate-in fade-in duration-200", children: _jsxs("div", { className: "bg-white w-full max-w-md sm:max-w-xl md:max-w-2xl min-h-screen relative flex flex-col shadow-2xl", children: [_jsxs("div", { className: "sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between", children: [_jsxs("button", { onClick: handleHeaderBack, className: "h-10 px-3 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center gap-1 text-gray-800 transition-colors text-xs font-bold", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), hasOutlets && selectedOutletId !== 'select' && (_jsx("span", { className: "hidden sm:inline", children: "Stores" }))] }), _jsxs("div", { className: "text-center px-2 truncate", children: [_jsx("h2", { className: "text-base font-extrabold text-gray-900 truncate", children: currentOutlet ? currentOutlet.name : store.name }), _jsx("p", { className: "text-[11px] text-gray-500 truncate", children: currentOutlet ? `Food Street Outlet • ${currentOutlet.deliveryTime}` : cuisinesText })] }), _jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("button", { onClick: () => onToggleFavorite(store.id), className: "w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors", children: _jsx(Heart, { className: `w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}` }) }), _jsx("button", { onClick: () => {
                                        if (navigator.share) {
                                            navigator.share({ title: currentOutlet ? currentOutlet.name : store.name, url: window.location.href });
                                        }
                                    }, className: "w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors", children: _jsx(Share2, { className: "w-5 h-5" }) })] })] }), _jsxs("div", { className: "relative w-full h-52 sm:h-60 bg-gray-900 overflow-hidden flex items-center justify-center", children: [_jsx("img", { src: currentOutlet ? currentOutlet.image : store.image, alt: currentOutlet ? currentOutlet.name : store.name, className: "w-full h-full object-cover transition-all duration-300", onError: (e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
                            } }), _jsxs("div", { className: "absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 text-white", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-black drop-shadow-sm", children: currentOutlet ? currentOutlet.name : store.name }), hasOutlets && (_jsx("span", { className: "px-2.5 py-0.5 bg-red-600/90 text-white rounded-md text-[10px] font-black uppercase tracking-wider", children: "Food Court" }))] }), _jsx("p", { className: "text-xs sm:text-sm text-gray-200 mt-1 font-medium drop-shadow-xs", children: cuisinesText })] })] }), !orderWindowStatus.isOpen && (_jsx("div", { className: "mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700", children: orderWindowStatus.isClosedForToday
                        ? orderWindowStatus.message
                        : `Orders open at ${orderWindowStatus.opensAt}.` })), !['store-ssv', 'store-jawa-hut', 'store-taj-biriyani', 'store-graduate-biryani', 'store-bite-adda', 'store-tummy-treat'].includes(store.id) && (_jsx("div", { className: "px-4 py-3 bg-white flex items-center justify-between border-b border-gray-100 text-xs font-semibold text-gray-600", children: _jsxs("div", { className: "flex items-center space-x-3", children: [(!hasOutlets || currentOutlet) && (_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(Clock, { className: "w-4 h-4 text-red-600 stroke-[2.2]" }), _jsx("span", { className: "text-gray-900 font-bold", children: currentOutlet ? currentOutlet.deliveryTime : store.deliveryTime })] })), (currentOutlet?.distance || store.distance) && (_jsxs("span", { className: "text-gray-400 font-medium", children: [(!hasOutlets || currentOutlet) && "• ", currentOutlet ? currentOutlet.distance : store.distance, " away"] }))] }) })), store.id === 'store-graduate-biryani' && !showGraduateMenu ? (_jsxs("div", { className: "flex flex-1 flex-col p-4 pb-28", children: [_jsxs("div", { className: "rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-6 w-6 shrink-0 text-amber-600" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-black uppercase tracking-wide text-amber-900", children: "Important: Order & Delivery Slots" }), _jsx("p", { className: "mt-2 text-sm font-semibold leading-relaxed text-amber-900", children: "Orders are accepted from 5:00 PM to 10:00 PM in 30-minute windows. Delivery is expected around 15 minutes after the selected window closes." })] })] }), _jsx("div", { className: "mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2", children: GRADUATE_BIRYANI_ORDER_SLOTS.map((slot) => (_jsxs("div", { className: "rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5", children: [_jsxs("p", { className: "text-xs font-black text-gray-900", children: ["Order: ", slot.orderWindow] }), _jsxs("p", { className: "mt-1 text-xs font-bold text-amber-800", children: ["Delivery around ", slot.deliveryTime] })] }, slot.orderWindow))) })] }), _jsx("div", { className: "sticky bottom-4 z-40 py-2 mt-auto", children: _jsx("button", { onClick: () => setShowGraduateMenu(true), className: "w-full rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-2xl transition-colors hover:bg-red-700", children: "Next: View Menu" }) })] })) : hasOutlets && selectedOutletId === 'select' ? (_jsxs("div", { className: "p-4 space-y-4 pb-28", children: [_jsxs("div", { className: "bg-linear-to-r from-red-600 via-red-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(StoreIcon, { className: "w-5 h-5 text-amber-300" }), _jsx("span", { className: "text-xs font-black uppercase tracking-wider text-amber-200", children: "Available Restaurants" })] }), _jsx("h3", { className: "text-xl font-black mt-1", children: "Select a Store to View Menu" }), _jsx("p", { className: "text-xs font-medium opacity-90 mt-1 leading-relaxed", children: "Explore the available restaurant menus below and tap any store to order." })] }), _jsx("div", { className: "pt-1", children: _jsxs("h4", { className: "text-xs font-black text-gray-800 uppercase tracking-wider", children: ["Select Restaurant (", store.outlets?.length, ")"] }) }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3.5", children: store.outlets?.map((outlet) => {
                                const outletItemCount = store.items.filter(i => i.storeId === outlet.id).length;
                                return (_jsxs("button", { onClick: () => {
                                        setSelectedOutletId(outlet.id);
                                        setSelectedCategory('all');
                                        setMenuSearch('');
                                    }, className: "bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm hover:border-red-400 hover:shadow-md transition-all text-left flex items-center space-x-3.5 group cursor-pointer", children: [_jsx("div", { className: "w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100", children: _jsx("img", { src: outlet.image, alt: outlet.name, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300", onError: (e) => {
                                                    e.target.src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
                                                } }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center justify-between gap-1", children: _jsx("h5", { className: "text-base font-extrabold text-gray-900 group-hover:text-red-600 transition-colors truncate", children: outlet.name }) }), _jsx("p", { className: "text-xs text-gray-500 truncate mt-0.5 font-medium", children: outlet.cuisines.slice(0, 3).join(', ') }), _jsxs("div", { className: "mt-2 flex items-center justify-between", children: [_jsxs("span", { className: "text-[11px] font-bold text-gray-400", children: [outlet.deliveryTime, " \u2022 ", outlet.distance] }), _jsx("span", { className: "text-xs font-black text-red-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5", children: "View Menu \u2192" })] })] })] }, outlet.id));
                            }) }), storeCartCount > 0 && (_jsx("div", { className: "sticky bottom-4 z-40 py-2 mt-auto", children: _jsxs("button", { id: "store-view-cart-floating-btn-grid", onClick: onOpenCart, className: "w-full min-h-[52px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-2xl transition-all active:scale-98 animate-in slide-in-from-bottom duration-300 cursor-pointer", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0 leading-none", children: [_jsxs("span", { className: "inline-flex items-center justify-center h-7 px-2.5 bg-red-800 text-white text-[10px] sm:text-xs font-black rounded-md shrink-0 leading-none", children: [storeCartCount, " ", storeCartCount === 1 ? 'item' : 'items'] }), _jsxs("span", { className: "text-sm font-extrabold leading-none", children: ["\u20B9", storeCartSubtotal.toFixed(0)] })] }), _jsxs("span", { className: "flex items-center text-xs sm:text-sm font-black uppercase tracking-wider leading-none whitespace-nowrap", children: ["View Cart ", _jsx("span", { "aria-hidden": "true", children: "\u2192" })] })] }) }))] })) : (
                /* View Mode 2: Specific Selected Store Menu Feed */
                _jsxs(_Fragment, { children: [_jsxs("div", { className: "sticky top-[61px] z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs py-3 px-4 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2.5", children: [_jsxs("button", { onClick: () => setVegOnly(!vegOnly), className: `flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${vegOnly ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`, children: [_jsx("span", { className: `w-3 h-3 rounded-sm border-2 flex items-center justify-center ${vegOnly ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-600'}`, children: _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-white" }) }), _jsx("span", { children: "Pure Veg Only" })] }), _jsxs("div", { className: "relative flex-1 min-w-[170px]", children: [_jsx(Search, { className: "w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" }), _jsx("input", { type: "text", value: menuSearch, onChange: (e) => setMenuSearch(e.target.value), placeholder: currentOutlet ? `Search in ${currentOutlet.name}...` : "Search in menu...", className: "w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-500" })] })] }), _jsxs("div", { className: "flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 pb-0.5 -mx-4 px-4", children: [_jsxs("button", { onClick: () => setSelectedCategory('all'), className: `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${selectedCategory === 'all'
                                                ? 'bg-gray-900 text-white shadow-xs'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'}`, children: ["All Items (", uniqueItems.length, ")"] }), availableCategories.map((cat) => (_jsx("button", { onClick: () => setSelectedCategory(cat), className: `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${selectedCategory === cat
                                                ? 'bg-gray-900 text-white shadow-xs'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'}`, children: cat }, cat)))] })] }), _jsx("div", { className: "p-4 space-y-3 pb-28", children: filteredItems.map((item) => {
                                const countInCart = getItemCountInCart(item.id);
                                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                                const isAvailableToday = !item.availableOnDays || item.availableOnDays.length === 0 || item.availableOnDays.includes(today);
                                const outlet = getOutletForItem(item);
                                return (_jsxs("div", { id: `menu-item-${item.id}`, className: "bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-start justify-between gap-4 hover:border-gray-200 transition-all", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mb-1.5", children: [_jsx("span", { className: `w-4 h-4 border flex items-center justify-center rounded-xs ${item.isVeg ? 'border-emerald-600' : 'border-red-600'}`, children: _jsx("span", { className: `w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}` }) }), item.isBestseller && (_jsx("span", { className: "px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold", children: "Bestseller" }))] }), _jsx("h4", { className: "text-sm sm:text-base font-extrabold text-gray-900 leading-tight", children: item.name }), _jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [_jsxs("span", { className: "text-sm font-bold text-gray-900", children: ["\u20B9", item.price.toFixed(0)] }), item.originalPrice && (_jsxs("span", { className: "text-xs text-gray-400 line-through", children: ["\u20B9", item.originalPrice.toFixed(0)] }))] }), !isAvailableToday && (_jsxs("div", { className: "mt-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700", children: ["Only available on ", item.availableOnDays?.join(', ')] })), _jsx("p", { className: "text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed", children: item.description })] }), _jsxs("div", { className: "relative shrink-0 flex flex-col items-center", children: [_jsx("div", { className: "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100", children: item.image && (_jsx("img", { src: item.image, alt: item.name, className: "w-full h-full object-cover", loading: "lazy", onError: (e) => {
                                                            e.target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80';
                                                        } })) }), _jsx("div", { className: "-mt-4 relative z-10", children: !isAvailableToday ? (_jsx("button", { disabled: true, className: "px-4 py-1.5 bg-gray-200 text-gray-500 border border-gray-300 text-[10px] font-black rounded-xl shadow-sm uppercase tracking-wider cursor-not-allowed", children: "ONLY ON WED" })) : countInCart === 0 ? (_jsx("button", { id: `add-btn-${item.id}`, onClick: () => onOpenItemModal(item), className: "px-5 py-1.5 bg-white text-red-600 hover:bg-red-50 border border-red-200 text-xs font-black rounded-xl shadow-md uppercase tracking-wider transition-all hover:scale-105 active:scale-95", children: "ADD" })) : (_jsxs("div", { className: "flex items-center bg-red-600 text-white rounded-xl shadow-md p-0.5", children: [_jsx("button", { onClick: () => onUpdateCartQuantity(item.id, -1), className: "w-6 h-6 flex items-center justify-center hover:bg-red-700 rounded-lg transition-colors", children: _jsx(Minus, { className: "w-3 h-3" }) }), _jsx("span", { className: "px-2 text-xs font-black", children: countInCart }), _jsx("button", { onClick: () => onUpdateCartQuantity(item.id, 1), className: "w-6 h-6 flex items-center justify-center hover:bg-red-700 rounded-lg transition-colors", children: _jsx(Plus, { className: "w-3 h-3" }) })] })) }), item.addons && item.addons.length > 0 && (_jsx("span", { className: "text-[10px] text-gray-400 font-medium mt-1", children: "customisable" }))] })] }, item.id));
                            }) }), storeCartCount > 0 && (_jsx("div", { className: "sticky bottom-4 z-40 px-4 py-2 mt-auto", children: _jsxs("button", { id: "store-view-cart-floating-btn", onClick: onOpenCart, className: "w-full min-h-[52px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-between gap-3 shadow-2xl transition-all active:scale-98 animate-in slide-in-from-bottom duration-300 cursor-pointer", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0 leading-none", children: [_jsxs("span", { className: "inline-flex items-center justify-center h-7 px-2.5 bg-red-800 text-white text-[10px] sm:text-xs font-black rounded-md shrink-0 leading-none", children: [storeCartCount, " ", storeCartCount === 1 ? 'item' : 'items'] }), _jsxs("span", { className: "text-sm font-extrabold leading-none", children: ["\u20B9", storeCartSubtotal.toFixed(0)] })] }), _jsxs("span", { className: "flex items-center text-xs sm:text-sm font-black uppercase tracking-wider leading-none whitespace-nowrap", children: ["View Cart ", _jsx("span", { "aria-hidden": "true", children: "\u2192" })] })] }) }))] }))] }) }));
};
