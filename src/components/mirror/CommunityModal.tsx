import React from 'react';
import { X, Heart, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryLook: (lookName: string) => void;
}

export function CommunityModal({ isOpen, onClose, onTryLook }: CommunityModalProps) {
  if (!isOpen) return null;

  const reels = [
    {
      title: '@PriyaGlam',
      views: '5k Views',
      look: 'Smoky Eye Drama ✨',
      bgColor: '#FF69B4',
      image: 'https://placehold.co/400x320/FF69B4/ffffff?text=Coimbatore+Party+Reel'
    },
    {
      title: '@VigneshGrooming',
      views: '1.2k Views',
      look: 'Clean Professional Stubble 🤵',
      bgColor: '#9333ea',
      image: 'https://placehold.co/400x320/9333ea/ffffff?text=Madurai+Quick+Style+Reel'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-black/90 h-screen flex flex-col text-white">
        <div className="p-4 w-full flex justify-between items-center bg-black/70 sticky top-0 z-10">
          <h3 className="text-xl text-white text-center flex items-center">
            <Users className="w-6 h-6 mr-2 text-pink-500" /> Local Trending
          </h3>
          <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/20">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow w-full p-2 space-y-4 overflow-y-auto">
          {reels.map((reel, index) => (
            <div key={index} className="bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-pink-500/50">
              <div
                className="h-80 w-full bg-cover bg-center flex items-end p-4"
                style={{ backgroundImage: `url('${reel.image}')` }}
              >
                <div className="text-white">
                  <p className="text-lg">
                    {reel.title} <span className="text-xs">{reel.views}</span>
                  </p>
                  <p className="text-sm">Look: {reel.look}</p>
                </div>
              </div>
              <div className="flex justify-between p-3 bg-gray-800">
                <button
                  onClick={() => toast.success('Reel Liked!')}
                  className="text-white flex items-center text-sm hover:text-red-400"
                >
                  <Heart className="w-5 h-5 mr-1" /> {index === 0 ? '250' : '89'}
                </button>
                <button
                  onClick={() => onTryLook(reel.look)}
                  className="bg-blue-400 text-white py-1 px-3 rounded-lg text-xs hover:bg-blue-500 transition-colors"
                >
                  <span className="mr-1">✨</span> Try on Look
                </button>
              </div>
            </div>
          ))}

          <p className="text-center text-gray-500 text-xs py-4">Loading more trending Reels...</p>
        </div>
      </div>
    </div>
  );
}
