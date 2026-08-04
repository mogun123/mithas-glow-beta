/**
 * Instant Filter Bar Component
 * Quick filters for price, distance, category, occasion
 */

import React, { useState } from 'react';
import { Search, DollarSign, MapPin, Tag, Target, RotateCcw, X } from 'lucide-react';
import { SmartFilterOptions } from '../types/feed.types';

interface InstantFilterBarProps {
  filters: SmartFilterOptions;
  onFiltersChange: (filters: Partial<SmartFilterOptions>) => void;
  onClearFilters: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function InstantFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  searchQuery,
  onSearchChange
}: InstantFilterBarProps) {
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [showDistance, setShowDistance] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showOccasion, setShowOccasion] = useState(false);

  const categories = [
    'Makeup', 'Fashion', 'Jewelry', 'Hair', 'Skincare', 'Wellness'
  ];

  const occasions = [
    'Wedding', 'Party', 'Office', 'Casual', 'Festival', 'Date Night'
  ];

  const distanceOptions = [
    { label: '1km', value: 1 },
    { label: '5km', value: 5 },
    { label: '10km', value: 10 },
    { label: '25km', value: 25 }
  ];

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery.trim() !== '';

  const handlePriceRangeChange = (min: number, max: number) => {
    onFiltersChange({ priceRange: [min, max] });
    setShowPriceRange(false);
  };

  const handleDistanceChange = (distance: number) => {
    onFiltersChange({ distance });
    setShowDistance(false);
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ category: category.toLowerCase() });
    setShowCategory(false);
  };

  const handleOccasionChange = (occasion: string) => {
    onFiltersChange({ occasion: occasion.toLowerCase() });
    setShowOccasion(false);
  };

  const getPriceRangeLabel = () => {
    if (!filters.priceRange) return 'Price';
    const [min, max] = filters.priceRange;
    if (max >= 10000) return `₹${min.toLocaleString()}+`;
    return `₹${min.toLocaleString()}-₹${max.toLocaleString()}`;
  };

  const getDistanceLabel = () => {
    if (!filters.distance) return 'Distance';
    return `${filters.distance}km`;
  };

  const getCategoryLabel = () => {
    if (!filters.category) return 'Category';
    return filters.category.charAt(0).toUpperCase() + filters.category.slice(1);
  };

  const getOccasionLabel = () => {
    if (!filters.occasion) return 'Occasion';
    return filters.occasion.charAt(0).toUpperCase() + filters.occasion.slice(1);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search for looks, products, creators..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {/* Price Filter */}
        <div className="relative">
          <button
            onClick={() => setShowPriceRange(!showPriceRange)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.priceRange
                ? 'bg-pink-100 text-pink-700 border border-pink-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{getPriceRangeLabel()}</span>
          </button>
          
          {showPriceRange && (
            <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-max">
              <div className="space-y-1">
                <button
                  onClick={() => handlePriceRangeChange(0, 1000)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                >
                  Under ₹1,000
                </button>
                <button
                  onClick={() => handlePriceRangeChange(1000, 5000)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                >
                  ₹1,000 - ₹5,000
                </button>
                <button
                  onClick={() => handlePriceRangeChange(5000, 10000)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                >
                  ₹5,000 - ₹10,000
                </button>
                <button
                  onClick={() => handlePriceRangeChange(10000, 50000)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                >
                  ₹10,000+
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Distance Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDistance(!showDistance)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.distance
                ? 'bg-pink-100 text-pink-700 border border-pink-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{getDistanceLabel()}</span>
          </button>
          
          {showDistance && (
            <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
              <div className="space-y-1">
                {distanceOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDistanceChange(option.value)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    Within {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategory(!showCategory)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.category
                ? 'bg-pink-100 text-pink-700 border border-pink-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{getCategoryLabel()}</span>
          </button>
          
          {showCategory && (
            <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
              <div className="grid grid-cols-2 gap-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Occasion Filter */}
        <div className="relative">
          <button
            onClick={() => setShowOccasion(!showOccasion)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.occasion
                ? 'bg-pink-100 text-pink-700 border border-pink-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>{getOccasionLabel()}</span>
          </button>
          
          {showOccasion && (
            <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
              <div className="grid grid-cols-2 gap-1">
                {occasions.map((occasion) => (
                  <button
                    key={occasion}
                    onClick={() => handleOccasionChange(occasion)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    {occasion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
