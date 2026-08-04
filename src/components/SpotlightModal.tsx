import { useState } from 'react';
import { X, Eye, Aperture, Calendar, UserSquare, Bookmark, Play, ShoppingBag, Star, MapPin, Heart } from 'lucide-react';

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

interface SpotlightContent {
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl: string;
  creator: {
    name: string;
    avatar: string;
    verified: boolean;
    location?: string;
  };
  metrics: {
    views: number;
    likes: number;
    saves: number;
  };
  tags: string[];
  price?: number;
  rating?: number;
  actions: Array<{
    label: string;
    icon: any;
    color: string;
    action: string;
  }>;
}

export function SpotlightModal({ isOpen, onClose, title }: SpotlightModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Dynamic content based on title
  const getContent = (): SpotlightContent => {
    if (title.includes('Teleport') || title.includes('Kyoto')) {
      return {
        title: 'Kyoto Cherry Blossom Look',
        description: 'Experience the ethereal beauty of Kyoto\'s cherry blossoms with this stunning virtual makeup transformation. Perfect for spring photoshoots and special occasions.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=300&fit=crop',
        creator: {
          name: 'Yuki Tanaka',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
          verified: true,
          location: 'Kyoto, Japan'
        },
        metrics: {
          views: 45200,
          likes: 3200,
          saves: 890
        },
        tags: ['cherry-blossom', 'japanese-beauty', 'spring-look', 'virtual-makeup'],
        actions: [
          { label: 'Try This Look', icon: Eye, color: 'purple', action: 'try_on' },
          { label: 'Teleport Now', icon: Aperture, color: 'pink', action: 'teleport' },
          { label: 'Save Look', icon: Bookmark, color: 'blue', action: 'save' }
        ]
      };
    } else if (title.includes('Artist') || title.includes('Janani')) {
      return {
        title: 'Janani S. - Bridal Makeup Expert',
        description: 'Award-winning makeup artist specializing in traditional and contemporary bridal looks. 10+ years of experience with over 500 happy brides.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
        creator: {
          name: 'Janani S.',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&crop=face',
          verified: true,
          location: 'Mumbai, India'
        },
        metrics: {
          views: 128000,
          likes: 8900,
          saves: 2100
        },
        tags: ['bridal-makeup', 'traditional', 'contemporary', 'expert'],
        price: 5000,
        rating: 4.9,
        actions: [
          { label: 'Book Now', icon: Calendar, color: 'purple', action: 'book' },
          { label: 'View Portfolio', icon: UserSquare, color: 'pink', action: 'profile' },
          { label: 'Message', icon: Heart, color: 'blue', action: 'message' }
        ]
      };
    } else {
      return {
        title: 'Neon Euphoria Liner Collection',
        description: 'Bold, vibrant neon eyeliners that make your eyes pop. Perfect for festivals, parties, and making a statement. Water-resistant and long-lasting formula.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        imageUrl: 'https://images.unsplash.com/photo-1610997968323-3d2a7c1f7b5c?w=400&h=300&fit=crop',
        creator: {
          name: 'Glow Cosmetics',
          avatar: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=40&h=40&fit=crop&crop=face',
          verified: true,
          location: 'New York, USA'
        },
        metrics: {
          views: 89000,
          likes: 5600,
          saves: 1800
        },
        tags: ['neon-makeup', 'eyeliner', 'festival-look', 'bold-colors'],
        price: 899,
        rating: 4.7,
        actions: [
          { label: 'Try This Look', icon: Eye, color: 'purple', action: 'try_on' },
          { label: 'Shop Now', icon: ShoppingBag, color: 'pink', action: 'shop' },
          { label: 'Save Product', icon: Bookmark, color: 'blue', action: 'save' }
        ]
      };
    }
  };

  const content = getContent();

  const handleAction = (action: string) => {
    console.log(`Spotlight Action: ${action} on ${content.title}`);
    
    // Handle different actions
    switch (action) {
      case 'try_on':
        console.log('Navigating to Mirror for try-on...');
        break;
      case 'teleport':
        console.log('Starting teleport experience...');
        break;
      case 'book':
        console.log('Opening booking modal...');
        break;
      case 'shop':
        console.log('Navigating to shop...');
        break;
      case 'save':
        console.log('Saving to collection...');
        break;
      default:
        console.log(`Handling action: ${action}`);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-white/95 backdrop-blur-lg z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`modal-bg p-6 rounded-3xl max-w-md w-11/12 max-h-[90vh] overflow-y-auto transform transition-transform duration-300 relative border border-gray-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h4 className="text-xs text-gray-500 mb-2">✨ Spotlight Feature</h4>
        <h3 className="text-2xl text-transparent bg-clip-text glow-accent mb-4">{content.title}</h3>

        {/* Video/Image Preview */}
        <div className="relative mb-4 rounded-xl overflow-hidden border border-pink-300">
          {content.videoUrl ? (
            <video
              className="w-full h-48 object-cover"
              src={content.videoUrl}
              controls={false}
              onMouseEnter={() => setIsPlaying(true)}
              onMouseLeave={() => setIsPlaying(false)}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <source src={content.videoUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={content.imageUrl}
              alt={content.title}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/400x200/FFD6E8/1f2937?text=Preview';
              }}
            />
          )}
          
          {content.videoUrl && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-12 h-12 text-white" />
            </div>
          )}
        </div>

        {/* Creator Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img
              src={content.creator.avatar}
              alt={content.creator.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-pink-200"
            />
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-semibold text-gray-900">{content.creator.name}</span>
                {content.creator.verified && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              {content.creator.location && (
                <div className="flex items-center text-xs text-gray-500">
                  <MapPin className="w-3 h-3 mr-1" />
                  {content.creator.location}
                </div>
              )}
            </div>
          </div>
          
          {/* Rating */}
          {content.rating && (
            <div className="flex items-center text-sm text-yellow-600">
              <Star className="w-4 h-4 fill-yellow-500 mr-1" />
              {content.rating}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3">{content.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {content.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-pink-100 text-pink-600 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Metrics */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
          <span><Eye className="w-3 h-3 inline mr-1" />{content.metrics.views.toLocaleString()}</span>
          <span><Heart className="w-3 h-3 inline mr-1" />{content.metrics.likes.toLocaleString()}</span>
          <span><Bookmark className="w-3 h-3 inline mr-1" />{content.metrics.saves.toLocaleString()}</span>
        </div>

        {/* Price */}
        {content.price && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Starting from</span>
              <span className="text-lg font-bold text-gray-900">₹{content.price.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {content.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action.action)}
              className={`w-full p-3 text-lg text-white rounded-xl shadow-xl transition-transform active:scale-95 ${
                action.color === 'purple' 
                  ? 'bg-purple-500 shadow-purple-400/40 hover:bg-purple-600'
                  : action.color === 'pink'
                  ? 'bg-pink-500 shadow-pink-400/40 hover:bg-pink-600'
                  : 'bg-blue-500 shadow-blue-400/40 hover:bg-blue-600'
              }`}
            >
              <action.icon className="w-5 h-5 inline mr-2" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
