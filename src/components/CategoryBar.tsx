import React from 'react';
import { Category } from '../types';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar px-4 space-x-3 sm:space-x-6 py-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              id={`category-item-${cat.slug}`}
              onClick={() => onSelectCategory(isSelected ? null : cat.slug)}
              className="flex flex-col items-center flex-shrink-0 group focus:outline-hidden transition-transform"
            >
              {/* Circular Avatar Container with soft background */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 flex items-center justify-center p-1.5 transition-all duration-200 ${
                  isSelected
                    ? 'bg-red-50 ring-2 ring-red-500 shadow-md scale-105'
                    : 'bg-[#F4F4F6] group-hover:bg-[#EAEAEA] group-hover:scale-102 shadow-xs'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-xs sm:text-sm font-semibold tracking-tight transition-colors ${
                  isSelected ? 'text-red-600 font-bold' : 'text-gray-800 group-hover:text-gray-900'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
