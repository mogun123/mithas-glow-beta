import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Trash2, Edit2, Star, Heart, MapPin, Calendar, Clock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PortfolioItem {
  id: string;
  type: 'before' | 'after' | 'bridal' | 'reception' | 'party' | 'hd' | 'airbrush' | 'hair';
  image_url: string;
  caption?: string;
  is_cover?: boolean;
  artist_id: string;
  created_at: string;
}

interface ProfessionalPortfolioProps {
  artistId: string;
  onBack?: () => void;
}

export default function ProfessionalPortfolio({ artistId, onBack }: ProfessionalPortfolioProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'before' | 'after' | 'bridal' | 'reception' | 'party' | 'hd' | 'airbrush' | 'hair'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

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

  // Load portfolio items from Supabase on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        
        // First try to fetch from artist_portfolio_items table if it exists
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('artist_portfolio_items')
          .select('*')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false });

        if (!portfolioError && portfolioData) {
          setPortfolioItems(portfolioData);
          return;
        }

        // Fallback: Try to fetch from shops table as JSONB array
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('portfolio_items')
          .eq('owner_id', artistId)
          .single();

        if (!shopError && shopData?.portfolio_items) {
          const items = typeof shopData.portfolio_items === 'string' 
            ? JSON.parse(shopData.portfolio_items) 
            : shopData.portfolio_items;
          setPortfolioItems(items);
        }
      } catch (err: any) {
        console.error('ProfessionalPortfolio: Load error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [artistId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Upload to Supabase Storage bucket 'portfolio-images'
      const fileExt = file.name.split('.').pop();
      const fileName = `${artistId}-${Date.now()}.${fileExt}`;
      const filePath = `portfolio/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Save metadata to database
      const newItem: Partial<PortfolioItem> = {
        artist_id: artistId,
        image_url: imageUrl,
        type: 'party', // default type
        caption: file.name.split('.')[0],
        created_at: new Date().toISOString(),
      };

      // Try artist_portfolio_items table first
      const { data: insertedItem, error: insertError } = await supabase
        .from('artist_portfolio_items')
        .insert(newItem)
        .select()
        .single();

      if (!insertError && insertedItem) {
        setPortfolioItems(prev => [insertedItem, ...prev]);
        toast.success('Image uploaded successfully!');
      } else {
        // Fallback: Update shops table JSONB array
        const { data: shopData } = await supabase
          .from('shops')
          .select('portfolio_items')
          .eq('owner_id', artistId)
          .single();

        const currentItems = shopData?.portfolio_items 
          ? (typeof shopData.portfolio_items === 'string' ? JSON.parse(shopData.portfolio_items) : shopData.portfolio_items)
          : [];

        const newItemWithId = { ...newItem, id: Date.now().toString() };
        const updatedItems = [newItemWithId, ...currentItems];

        await supabase
          .from('shops')
          .update({
            portfolio_items: JSON.stringify(updatedItems),
            updated_at: new Date().toISOString(),
          })
          .eq('owner_id', artistId);

        setPortfolioItems(prev => [newItemWithId, ...prev]);
        toast.success('Image uploaded successfully!');
      }
    } catch (error: any) {
      console.error('ProfessionalPortfolio: Upload error:', error.message);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      // Delete from artist_portfolio_items table
      const { error: deleteError } = await supabase
        .from('artist_portfolio_items')
        .delete()
        .eq('id', itemId);

      if (!deleteError) {
        setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
        toast.success('Image deleted');
        return;
      }

      // Fallback: Remove from shops JSONB array
      const { data: shopData } = await supabase
        .from('shops')
        .select('portfolio_items')
        .eq('owner_id', artistId)
        .single();

      const currentItems = shopData?.portfolio_items 
        ? (typeof shopData.portfolio_items === 'string' ? JSON.parse(shopData.portfolio_items) : shopData.portfolio_items)
        : [];

      const updatedItems = currentItems.filter((item: any) => item.id !== itemId);

      await supabase
        .from('shops')
        .update({
          portfolio_items: JSON.stringify(updatedItems),
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', artistId);

      setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Image deleted');
    } catch (error: any) {
      console.error('ProfessionalPortfolio: Delete error:', error.message);
      toast.error('Failed to delete image');
    }
  };

  const handleSetCover = async (itemId: string) => {
    try {
      // Update artist_portfolio_items table
      await supabase
        .from('artist_portfolio_items')
        .update({ is_cover: false })
        .eq('artist_id', artistId);

      const { error } = await supabase
        .from('artist_portfolio_items')
        .update({ is_cover: true })
        .eq('id', itemId);

      if (!error) {
        setPortfolioItems(prev => prev.map(item => ({
          ...item,
          is_cover: item.id === itemId,
        })));
        toast.success('Cover image updated');
        return;
      }

      // Fallback: Update shops JSONB array
      const { data: shopData } = await supabase
        .from('shops')
        .select('portfolio_items')
        .eq('owner_id', artistId)
        .single();

      const currentItems = shopData?.portfolio_items 
        ? (typeof shopData.portfolio_items === 'string' ? JSON.parse(shopData.portfolio_items) : shopData.portfolio_items)
        : [];

      const updatedItems = currentItems.map((item: any) => ({
        ...item,
        is_cover: item.id === itemId,
      }));

      await supabase
        .from('shops')
        .update({
          portfolio_items: JSON.stringify(updatedItems),
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', artistId);

      setPortfolioItems(prev => prev.map(item => ({
        ...item,
        is_cover: item.id === itemId,
      })));
      toast.success('Cover image updated');
    } catch (error: any) {
      console.error('ProfessionalPortfolio: Set cover error:', error.message);
      toast.error('Failed to set cover image');
    }
  };

  const filteredItems = activeFilter === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.type === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500">Loading portfolio...</p>
        </div>
      </div>
    );
  }

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
                      src={item.image_url}
                      alt={item.caption || 'Portfolio item'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Cover Badge */}
                    {item.is_cover && (
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
