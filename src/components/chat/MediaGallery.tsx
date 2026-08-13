import React, { useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface MediaGalleryProps {
  media: Array<{
    id: string;
    storage_path: string;
    media_type: string;
    thumbnail_path: string | null;
  }>;
  onClose: () => void;
}

export function MediaGallery({ media, onClose }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<typeof media[0] | null>(null);

  if (media.length === 0) return null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 gap-2 p-2">
        {media.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-pink-400 transition-all"
          >
            {item.media_type.startsWith('image/') ? (
              <img
                src={item.thumbnail_path || item.storage_path}
                alt="Media attachment"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Fullscreen Viewer */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {selectedMedia.media_type.startsWith('image/') ? (
            <img
              src={selectedMedia.storage_path}
              alt="Full size media"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={selectedMedia.storage_path}
              controls
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
