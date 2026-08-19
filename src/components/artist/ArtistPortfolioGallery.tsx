import React, { useState } from 'react';
import { Image as ImageIcon, ChevronRight, X, Sparkles } from 'lucide-react';
import type { ArtistPortfolioItem } from '../../lib/database.types';

interface ArtistPortfolioGalleryProps {
  portfolioItems: ArtistPortfolioItem[];
}

export const ArtistPortfolioGallery: React.FC<ArtistPortfolioGalleryProps> = ({ portfolioItems }) => {
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ArtistPortfolioItem | null>(null);

  if (!portfolioItems || portfolioItems.length === 0) {
    return (
      <div className="mt-3 px-4 py-3 bg-slate-50/60 rounded-xl border border-slate-100/80 mx-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <ImageIcon className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
          <span>Artist portfolio updates coming soon</span>
        </div>
      </div>
    );
  }

  // Display top featured or regular portfolio items
  const displayItems = portfolioItems.slice(0, 8);

  return (
    <div className="mt-3 bg-white py-2.5 border-y border-pink-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
          Portfolio
          <span className="text-[11px] text-slate-400 font-normal">({portfolioItems.length})</span>
        </h2>
        {portfolioItems.length > 3 && (
          <button
            onClick={() => setShowFullGallery(true)}
            className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 transition-colors flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Instagram-Style Horizontal Scroll Gallery */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {displayItems.map((item, index) => (
          <div
            key={item.id || index}
            onClick={() => setSelectedImage(item)}
            className="flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden shadow-xs border border-slate-100 relative cursor-pointer group active:scale-95 transition-transform"
          >
            <img
              src={item.image_url}
              alt={item.caption || item.title || `Portfolio ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {item.is_featured && (
              <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-pink-600/90 text-white rounded text-[8px] font-bold shadow-xs">
                Featured
              </div>
            )}
            {item.caption && (
              <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-[9px] text-white font-medium truncate">{item.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Single Image Viewer */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            aria-label="Close image"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-md w-full max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <img
              src={selectedImage.image_url}
              alt={selectedImage.caption || 'Portfolio item'}
              className="w-full h-full object-contain bg-black max-h-[70vh]"
            />
            {selectedImage.caption && (
              <div className="p-3 bg-slate-900 text-white text-xs font-medium">
                <p>{selectedImage.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Portfolio Modal */}
      {showFullGallery && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowFullGallery(false)}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-pink-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-pink-500" />
                Artist Portfolio ({portfolioItems.length})
              </h3>
              <button
                onClick={() => setShowFullGallery(false)}
                className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto grid grid-cols-3 gap-2 max-h-[calc(85vh-60px)]">
              {portfolioItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedImage(item)}
                  className="aspect-square rounded-xl overflow-hidden shadow-xs border border-slate-100 relative cursor-pointer group"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || `Portfolio ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.caption && (
                    <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] text-white font-medium line-clamp-1">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
