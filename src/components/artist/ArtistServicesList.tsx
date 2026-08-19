import React, { useMemo, useState } from 'react';
import { 
  Clock, CheckCircle, ChevronDown, ChevronUp, Sparkles, 
  Crown, Scissors, Gem, Heart, Eye, Shirt, Smile, Flower2 
} from 'lucide-react';
import type { ArtistService } from '../../../hooks/use-booking';
import { SERVICE_CATALOG } from '../professional/serviceCatalog';

interface ArtistServicesListProps {
  services: ArtistService[];
  selectedServiceId: string | null;
  onSelectService: (service: ArtistService) => void;
}

export const ArtistServicesList: React.FC<ArtistServicesListProps> = ({
  services,
  selectedServiceId,
  onSelectService,
}) => {
  // Category map for pretty labels & emojis
  const categoryMetaMap = useMemo(() => {
    const map = new Map<string, { label: string; emoji: string }>();
    SERVICE_CATALOG.forEach(cat => {
      map.set(cat.id, { label: cat.label, emoji: cat.emoji });
    });

    // Add fallback aliases for database categories
    map.set('bridal', { label: 'Bridal', emoji: '👰' });
    map.set('party', { label: 'Party Makeup', emoji: '🎉' });
    map.set('home_service', { label: 'Home Services', emoji: '🏠' });
    map.set('reception', { label: 'Reception', emoji: '👑' });
    map.set('hd_makeup', { label: 'HD Makeup', emoji: '💄' });
    map.set('airbrush', { label: 'Airbrush', emoji: '✨' });
    map.set('hair', { label: 'Hair Styling', emoji: '💇' });
    map.set('skin_facial', { label: 'Skin Care', emoji: '✨' });
    map.set('mehendi', { label: 'Mehendi', emoji: '🌿' });
    map.set('waxing', { label: 'Waxing', emoji: '🪒' });
    map.set('nails', { label: 'Nails', emoji: '💅' });

    return map;
  }, []);

  // Match icon for individual service items
  const getServiceIcon = (category: string, title: string) => {
    const lowerTitle = title.toLowerCase();
    const lowerCat = (category || '').toLowerCase();

    if (lowerTitle.includes('bridal') || lowerCat.includes('bridal') || lowerTitle.includes('wedding')) {
      return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (lowerTitle.includes('hair') || lowerCat.includes('hair') || lowerTitle.includes('cut') || lowerTitle.includes('style')) {
      return <Scissors className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (lowerTitle.includes('mehendi') || lowerTitle.includes('henna') || lowerCat.includes('mehendi')) {
      return <Flower2 className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (lowerTitle.includes('saree') || lowerTitle.includes('drape') || lowerTitle.includes('outfit')) {
      return <Shirt className="w-3.5 h-3.5 text-pink-500" />;
    }
    if (lowerTitle.includes('jewel') || lowerTitle.includes('ornament')) {
      return <Gem className="w-3.5 h-3.5 text-cyan-500" />;
    }
    if (lowerTitle.includes('lash') || lowerTitle.includes('eye')) {
      return <Eye className="w-3.5 h-3.5 text-indigo-500" />;
    }
    if (lowerTitle.includes('nail') || lowerCat.includes('nail')) {
      return <Heart className="w-3.5 h-3.5 text-rose-500" />;
    }
    if (lowerTitle.includes('facial') || lowerTitle.includes('skin') || lowerCat.includes('skin')) {
      return <Smile className="w-3.5 h-3.5 text-teal-500" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-pink-500" />;
  };

  // Group real active services by category
  const groupedServices = useMemo(() => {
    const groups = new Map<string, ArtistService[]>();
    
    (services || []).forEach((service) => {
      const catKey = service.category || 'other';
      if (!groups.has(catKey)) {
        groups.set(catKey, []);
      }
      groups.get(catKey)!.push(service);
    });

    return Array.from(groups.entries()).map(([catKey, items]) => {
      const meta = categoryMetaMap.get(catKey) || {
        label: catKey.replace('_', ' ').toUpperCase(),
        emoji: '💄',
      };
      return {
        key: catKey,
        label: meta.label,
        emoji: meta.emoji,
        services: items,
      };
    });
  }, [services, categoryMetaMap]);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const toggleCategory = (key: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const displayedGroups = useMemo(() => {
    if (activeCategoryFilter === 'all') return groupedServices;
    return groupedServices.filter(g => g.key === activeCategoryFilter);
  }, [groupedServices, activeCategoryFilter]);

  if (!services || services.length === 0) {
    return (
      <div className="mt-3 px-4 py-6 text-center bg-white rounded-2xl border border-pink-50 shadow-xs">
        <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-xs font-bold text-slate-700 mb-0.5">No services listed</p>
        <p className="text-[11px] text-slate-400">This artist has not published active services yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 px-4">
      {/* Menu Title */}
      <h2 className="text-[13px] font-bold text-slate-900 mb-2 flex items-center justify-between">
        <span>Services Menu</span>
        <span className="text-[11px] text-pink-600 font-semibold">{services.length} services</span>
      </h2>

      {/* Category Quick-Filter Chips */}
      {groupedServices.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 pt-0.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              activeCategoryFilter === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xs'
                : 'bg-white border border-pink-100 text-slate-600 hover:bg-pink-50'
            }`}
          >
            All ({services.length})
          </button>
          {groupedServices.map((group) => {
            const isSelected = activeCategoryFilter === group.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveCategoryFilter(group.key)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xs'
                    : 'bg-white border border-pink-100 text-slate-600 hover:bg-pink-50'
                }`}
              >
                <span className="text-[11px]">{group.emoji}</span>
                <span>{group.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                  ({group.services.length})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact Services List */}
      <div className="space-y-2.5 mt-1">
        {displayedGroups.map((group) => {
          const isCollapsed = !!collapsedCategories[group.key];
          return (
            <div key={group.key} className="bg-white rounded-xl border border-pink-100/80 shadow-xs overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.key)}
                className="w-full px-3 py-2 bg-gradient-to-r from-pink-50/70 to-purple-50/30 flex items-center justify-between text-left hover:bg-pink-50/80 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{group.emoji}</span>
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                    {group.label}
                  </h3>
                  <span className="px-1.5 py-0.2 bg-white text-pink-600 rounded-full text-[9px] font-bold border border-pink-100">
                    {group.services.length}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Compact Service Items */}
              {!isCollapsed && (
                <div className="divide-y divide-pink-50/60">
                  {group.services.map((service) => {
                    const isSelected = selectedServiceId === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => onSelectService(service)}
                        className={`p-2.5 min-h-[44px] flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] ${
                          isSelected
                            ? 'bg-pink-50/70 border-l-3 border-pink-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* 28-36px Icon Container */}
                        <div className="w-8 h-8 rounded-xl bg-pink-50/90 border border-pink-100 flex items-center justify-center flex-shrink-0">
                          {getServiceIcon(service.category, service.title)}
                        </div>

                        {/* Title & Duration */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-bold text-slate-900 truncate leading-snug">
                            {service.title}
                          </h4>
                          {service.description && (
                            <p className="text-[10px] text-slate-500 line-clamp-1 leading-none mt-0.5">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">
                              {service.duration_minutes} min
                            </span>
                          </div>
                        </div>

                        {/* Price & Action Badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[13px] font-extrabold text-slate-900">
                            ₹{service.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-pink-500 text-white hover:bg-pink-600 active:scale-95 shadow-xs'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Book'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
