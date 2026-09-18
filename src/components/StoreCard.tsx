import React from 'react';
import { Heart } from 'lucide-react';
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
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            {/* Store Name */}
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight group-hover:text-red-600 transition-colors flex items-center gap-2">
              <span>{store.name}</span>
              {store.outlets && store.outlets.length > 0 && (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  Food Court ({store.outlets.length} Outlets)
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Cuisines or Outlets preview */}
        {store.outlets && store.outlets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {store.outlets.map((outlet) => (
              <span
                key={outlet.id}
                className="text-[11px] font-semibold text-gray-700 bg-gray-100/80 border border-gray-200 px-2.5 py-0.5 rounded-lg"
              >
                {outlet.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 line-clamp-1 font-medium">
            {store.cuisines.join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
};

