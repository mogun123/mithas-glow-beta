import { useState } from 'react';
import { Camera, Trash2, Edit2, Star, Heart, MapPin, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PortfolioItem {
  id: string;
  type: 'before' | 'after' | 'bridal' | 'reception' | 'party' | 'hd' | 'airbrush' | 'hair';
  imageUrl: string;
  caption?: string;
  isCover?: boolean;
  createdAt: string;
}

interface ProfessionalPortfolioProps {
  artistId: string;
  onBack?: () => void;
}

export default function ProfessionalPortfolio({ artistId, onBack }: ProfessionalPortfolioProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'before' | 'after' | 'bridal' | 'reception' | 'party' | 'hd' | 'airbrush' | 'hair'>('all');
  const [isUploading, setIsUploading] = useState(false);

  // Mock portfolio items - would be fetched from Supabase
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    {
      id: '1',
      type: 'bridal',
      imageUrl: 'https://images.unsplash.com/photo-1595476108011-b9e41c96d1ea?w=400',
      caption: 'Traditional Bridal Makeup',
      isCover: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'reception',
      imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400',
      caption: 'Reception Glam Look',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      type: 'hd',
      imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
      caption: 'HD Makeup for Photoshoot',
      createdAt: new Date().toISOString(),
    },
  ]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'bridal', label: 'Bridal' },
    { id: 'reception', label: 'Reception' },
    { id: 'party', label: 'Party' },
    { id: 'hd', label: 'HD' },
    { id: 'airbrush', label: 'Airbrush' },
    { id: 'hair', label: 'Hair' },
    { id: 'before', label: 'Before' },
    { id: 'after', label: 'After' },
  ];

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      // Simulate upload - would integrate with Supabase Storage
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Image uploaded successfully!');
      // Would add new item to portfolio
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      // Would delete from Supabase Storage and database
      setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Image deleted');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleSetCover = async (itemId: string) => {
    try {
      // Would update cover in database
      setPortfolioItems(prev => prev.map(item => ({
        ...item,
        isCover: item.id === itemId,
      })));
      toast.success('Cover image updated');
    } catch (error) {
      toast.error('Failed to set cover image');
    }
  };

  const filteredItems = activeFilter === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.type === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">Portfolio</h1>
              <p className="text-xs text-gray-500">{portfolioItems.length} items</p>
            </div>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-[#D4AF37] hover:bg-[#B8962E] text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#D4AF37] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No portfolio items yet</p>
            <Button onClick={handleUpload} variant="outline">
              Upload your first image
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <Card key={item.id} className="group relative overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square relative">
                    <img
                      src={item.imageUrl}
                      alt={item.caption || 'Portfolio item'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Cover Badge */}
                    {item.isCover && (
                      <Badge className="absolute top-2 left-2 bg-[#D4AF37]">
                        <Star className="w-3 h-3 mr-1" />
                        Cover
                      </Badge>
                    )}

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleSetCover(item.id)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                        title="Set as cover"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <p className="text-xs text-gray-600 truncate">{item.caption}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Badge variant="outline" className="text-[10px]">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
