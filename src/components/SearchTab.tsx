import React, { useState } from 'react';
import { Search, Star, Sparkles } from 'lucide-react';
import { Store, MenuItem } from '../types';

interface SearchTabProps {
  stores: Store[];
  initialQuery?: string;
  onSelectStore: (store: Store) => void;
  onSelectMenuItem: (item: MenuItem, store: Store) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  stores,
  initialQuery = '',
  onSelectStore,
  onSelectMenuItem,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const quickFilters = [
    { label: 'All', value: null },
    { label: 'Burgers', value: 'Burgers' },
    { label: 'Pizza', value: 'Pizza' },
    { label: 'Biryani', value: 'Biryani' },
    { label: 'Ice Cream', value: 'Ice Cream' },
    { label: 'South Indian', value: 'South Indian' },
    { label: 'Chicken', value: 'Chicken' },
    { label: 'Pure Veg', value: 'veg' },
    { label: 'Top Rated 4.5+', value: 'rated' },
  ];

  // Match stores & dishes
  const normalizedQuery = query.toLowerCase().trim();

  const matchingStores = stores.filter((store) => {
    if (selectedFilter === 'veg') {
      const hasVeg = store.items.some(i => i.isVeg);
      if (!hasVeg) return false;
    }
    if (selectedFilter === 'rated' && store.rating < 4.5) return false;
    if (selectedFilter && selectedFilter !== 'veg' && selectedFilter !== 'rated') {
      const matchCuisine = store.cuisines.some(c => c.toLowerCase().includes(selectedFilter.toLowerCase()));
      const matchItems = store.items.some(i => i.category.toLowerCase().includes(selectedFilter.toLowerCase()) || i.name.toLowerCase().includes(selectedFilter.toLowerCase()));
      if (!matchCuisine && !matchItems) return false;
    }

    if (!normalizedQuery) return true;

    const matchesName = store.name.toLowerCase().includes(normalizedQuery);
    const matchesCuisine = store.cuisines.some(c => c.toLowerCase().includes(normalizedQuery));
    const matchesDish = store.items.some(i => i.name.toLowerCase().includes(normalizedQuery) || i.description.toLowerCase().includes(normalizedQuery));
    return matchesName || matchesCuisine || matchesDish;
  });

  // Extract matching dishes
  const matchingDishes: { item: MenuItem; store: Store }[] = [];
  stores.forEach((st) => {
    st.items.forEach((item) => {
      if (selectedFilter === 'veg' && !item.isVeg) return;
      if (!normalizedQuery) return;
      if (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery)
      ) {
        matchingDishes.push({ item, store: st });
      }
    });
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Search Input Bar */}
      <div className="bg-white p-4 sticky top-0 z-20 border-b border-gray-100 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            id="search-tab-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, burgers, biryani, pizzas..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm font-medium rounded-2xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {quickFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setSelectedFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedFilter === f.value
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Dishes result if query present */}
        {matchingDishes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-400">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Matching Dishes ({matchingDishes.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchingDishes.map(({ item, store }) => (
                <div
                  key={item.id}
                  onClick={() => onSelectMenuItem(item, store)}
                  className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-red-200 transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className={`w-3 h-3 border flex items-center justify-center rounded-xs ${
                        item.isVeg ? 'border-emerald-600' : 'border-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold truncate">{store.name}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-red-600">
                      {item.name}
                    </h4>
                    <span className="text-xs font-black text-gray-900 mt-1 block">₹{item.price.toFixed(0)}</span>
                  </div>

                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants Feed */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
            Restaurants ({matchingStores.length})
          </h3>

          {matchingStores.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs space-y-2">
              <p className="text-sm font-bold text-gray-800">No restaurants match your search</p>
              <p className="text-xs text-gray-500">Try searching for burgers, pizza, chicken, or biryani.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchingStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => onSelectStore(store)}
                  className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5 hover:border-gray-200 transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={store.image}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-extrabold text-gray-900 truncate group-hover:text-red-600">
                        {store.name}
                      </h4>
                      <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-bold shrink-0">
                        <span>{store.rating}</span>
                        <Star className="w-3 h-3 fill-emerald-600" />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 truncate mt-0.5">{store.cuisines.join(', ')}</p>

                    <div className="flex items-center text-xs font-semibold text-gray-600 mt-2">
                      <span>{store.deliveryTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
