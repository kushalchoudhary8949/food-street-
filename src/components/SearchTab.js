import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { getStoreDiscount } from '../utils/discount';
export const SearchTab = ({ stores, initialQuery = '', onSelectStore, onSelectMenuItem, }) => {
    const [query, setQuery] = useState(initialQuery);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const quickFilters = [
        { label: 'All', value: null },
        { label: 'Burgers', value: 'Burgers' },
        { label: 'Pizza', value: 'Pizza' },
        { label: 'Biryani', value: 'Biryani' },
        { label: 'Ice Cream', value: 'Ice Cream' },
        { label: 'South Indian', value: 'South Indian' },
        { label: 'Chicken', value: 'Chicken' },
        { label: 'Pure Veg', value: 'veg' },
    ];
    // Match stores & dishes
    const normalizedQuery = query.toLowerCase().trim();
    const matchingStores = stores.filter((store) => {
        if (selectedFilter === 'veg') {
            const hasVeg = store.items.some(i => i.isVeg);
            if (!hasVeg)
                return false;
        }
        if (selectedFilter && selectedFilter !== 'veg') {
            const matchCuisine = store.cuisines.some(c => c.toLowerCase().includes(selectedFilter.toLowerCase()));
            const matchItems = store.items.some(i => i.category.toLowerCase().includes(selectedFilter.toLowerCase()) || i.name.toLowerCase().includes(selectedFilter.toLowerCase()));
            if (!matchCuisine && !matchItems)
                return false;
        }
        if (!normalizedQuery)
            return true;
        const matchesName = store.name.toLowerCase().includes(normalizedQuery);
        const matchesCuisine = store.cuisines.some(c => c.toLowerCase().includes(normalizedQuery));
        const matchesDish = store.items.some(i => i.name.toLowerCase().includes(normalizedQuery) || i.description.toLowerCase().includes(normalizedQuery));
        return matchesName || matchesCuisine || matchesDish;
    });
    // Extract matching dishes
    const matchingDishes = [];
    stores.forEach((st) => {
        st.items.forEach((item) => {
            if (selectedFilter === 'veg' && !item.isVeg)
                return;
            if (!normalizedQuery)
                return;
            if (item.name.toLowerCase().includes(normalizedQuery) ||
                item.description.toLowerCase().includes(normalizedQuery) ||
                item.category.toLowerCase().includes(normalizedQuery)) {
                matchingDishes.push({ item, store: st });
            }
        });
    });
    return (_jsxs("div", { className: "space-y-4 pb-24", children: [_jsxs("div", { className: "bg-white p-4 sticky top-0 z-20 border-b border-gray-100 shadow-xs space-y-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" }), _jsx("input", { id: "search-tab-input", type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search restaurants, burgers, biryani, pizzas...", className: "w-full pl-11 pr-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm font-medium rounded-2xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all", autoFocus: true }), query && (_jsx("button", { onClick: () => setQuery(''), className: "absolute right-3.5 top-3.5 text-xs font-bold text-gray-400 hover:text-gray-600", children: "Clear" }))] }), _jsx("div", { className: "flex items-center space-x-2 overflow-x-auto no-scrollbar py-1", children: quickFilters.map((f) => (_jsx("button", { onClick: () => setSelectedFilter(f.value), className: `px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${selectedFilter === f.value
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: f.label }, f.label))) })] }), _jsxs("div", { className: "px-4 space-y-6", children: [matchingDishes.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center space-x-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-400", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-red-500" }), _jsxs("span", { children: ["Matching Dishes (", matchingDishes.length, ")"] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: matchingDishes.map(({ item, store }) => (_jsxs("div", { onClick: () => onSelectMenuItem(item, store), className: "bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-red-200 transition-all cursor-pointer group", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center space-x-1.5 mb-1", children: [_jsx("span", { className: `w-3 h-3 border flex items-center justify-center rounded-xs ${item.isVeg ? 'border-emerald-600' : 'border-red-600'}`, children: _jsx("span", { className: `w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}` }) }), _jsx("span", { className: "text-[11px] text-gray-500 font-semibold truncate", children: store.name })] }), _jsx("h4", { className: "text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-red-600", children: item.name }), _jsxs("span", { className: "text-xs font-black text-gray-900 mt-1 block", children: ["\u20B9", item.price.toFixed(0)] })] }), _jsx("div", { className: "w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0", children: item.image && (_jsx("img", { src: item.image, alt: item.name, className: "w-full h-full object-cover group-hover:scale-105 transition-transform" })) })] }, item.id))) })] })), _jsxs("div", { className: "space-y-3", children: [_jsxs("h3", { className: "text-xs font-extrabold uppercase tracking-wider text-gray-400", children: ["Restaurants (", matchingStores.length, ")"] }), matchingStores.length === 0 ? (_jsxs("div", { className: "bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs space-y-2", children: [_jsx("p", { className: "text-sm font-bold text-gray-800", children: "No restaurants match your search" }), _jsx("p", { className: "text-xs text-gray-500", children: "Try searching for burgers, pizza, chicken, or biryani." })] })) : (_jsx("div", { className: "space-y-3", children: matchingStores.map((store) => {
    const discount = getStoreDiscount(store);
    return (_jsxs("div", { onClick: () => onSelectStore(store), className: "bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-gray-200 transition-all cursor-pointer group", children: [_jsx("div", { className: "w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0", children: _jsx("img", { src: store.image, alt: store.name, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h4", { className: "text-base font-extrabold text-gray-900 truncate group-hover:text-red-600", children: store.name }) }), _jsx("p", { className: "text-xs text-gray-500 truncate mt-0.5", children: store.cuisines.join(', ') }), _jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-gray-600 mt-2", children: [_jsx("span", { children: store.deliveryTime }), discount && (_jsx("span", { className: "text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md", children: discount.label }))] })] })] }, store.id));
}) }))] })] })] }));
};
