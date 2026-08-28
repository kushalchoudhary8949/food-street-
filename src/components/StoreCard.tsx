import React from 'react';
import { Star, Heart } from 'lucide-react';
import { Store } from '../types';

interface StoreCardProps {
  store: Store;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, storeId: string) => void;
  onClick: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  isFavorite,
  onToggleFavorite,
  onClick,
}) => {
  return (
    <div
      id={`store-card-${store.id}`}
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md border border-gray-100 transition-all duration-200 cursor-pointer group flex flex-col"
    >
      {/* Store Banner Image */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-gray-100">
        <img
          src={store.image}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Favorite Button */}
        <button
          id={`fav-btn-${store.id}`}
          onClick={(e) => onToggleFavorite(e, store.id)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-700 hover:text-red-500 transition-all shadow-xs"
          title={isFavorite ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Card Content Footer */}
      <div className="p-4 flex items-center justify-between">
        <div>
          {/* Store Name */}
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight group-hover:text-red-600 transition-colors">
            {store.name}
          </h3>
        </div>

        {/* Rating Pill matching original */}
        <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
          <span className="text-sm font-bold text-gray-900">{store.rating.toFixed(1)}</span>
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 stroke-[1.5]" />
        </div>
      </div>
    </div>
  );
};

