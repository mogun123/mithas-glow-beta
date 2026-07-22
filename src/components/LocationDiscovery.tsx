import { useState, useEffect } from 'react';
import { MapPin, Navigation, Star, Phone, Mail, Clock, Filter, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface LocationService {
  getCurrentPosition: () => Promise<{ lat: number; lng: number }>;
  calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
}

interface NearbyArtist {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  distance: number;
  address: string;
  phone: string;
  email: string;
  isOpen: boolean;
  nextAvailable: string;
  services: string[];
  priceRange: string;
  verified: boolean;
}

interface NearbyStore {
  id: string;
  name: string;
  logo: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: number;
  address: string;
  phone: string;
  isOpen: boolean;
  products: string[];
  brands: string[];
}

interface LocationDiscoveryProps {
  userId?: string | null;
  onArtistSelect: (artist: NearbyArtist) => void;
  onStoreSelect: (store: NearbyStore) => void;
  onBookArtist: (artistId: string) => void;
}

export function LocationDiscovery({ 
  userId, 
  onArtistSelect, 
  onStoreSelect, 
  onBookArtist 
}: LocationDiscoveryProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState<'artists' | 'stores'>('artists');
  const [searchRadius, setSearchRadius] = useState(5); // km
  const [searchQuery, setSearchQuery] = useState('');
  const [artists, setArtists] = useState<NearbyArtist[]>([]);
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Location service implementation
  const locationService: LocationService = {
    getCurrentPosition: () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
    },

    calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await locationService.getCurrentPosition();
      setUserLocation(position);
      toast.success('📍 Location detected successfully');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to get your location. Please enable location services.');
      // Fallback to Mumbai coordinates
      setUserLocation({ lat: 19.0760, lng: 72.8777 });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Mock data generation for nearby artists and stores
  const generateMockData = () => {
    if (!userLocation) return;

    const mockArtists: NearbyArtist[] = [
      {
        id: '1',
        name: 'Priya Sharma',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
        specialty: 'Bridal Makeup',
        rating: 4.9,
        reviewCount: 127,
        distance: 1.2,
        address: '123 Bandra West, Mumbai',
        phone: '+91 98765 43210',
        email: 'priya@example.com',
        isOpen: true,
        nextAvailable: 'Today, 2:00 PM',
        services: ['Bridal', 'Party', 'Photoshoot'],
        priceRange: '₹5,000 - ₹15,000',
        verified: true
      },
      {
        id: '2',
        name: 'Anita Patel',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&crop=face',
        specialty: 'Fashion Makeup',
        rating: 4.8,
        reviewCount: 89,
        distance: 2.8,
        address: '456 Andheri East, Mumbai',
        phone: '+91 98765 43211',
        email: 'anita@example.com',
        isOpen: true,
        nextAvailable: 'Tomorrow, 10:00 AM',
        services: ['Fashion', 'Editorial', 'Events'],
        priceRange: '₹3,000 - ₹10,000',
        verified: true
      },
      {
        id: '3',
        name: 'Kavita Reddy',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
        specialty: 'Hair Styling',
        rating: 4.7,
        reviewCount: 156,
        distance: 4.5,
        address: '789 Juhu, Mumbai',
        phone: '+91 98765 43212',
        email: 'kavita@example.com',
        isOpen: false,
        nextAvailable: 'Monday, 11:00 AM',
        services: ['Hair', 'Styling', 'Treatment'],
        priceRange: '₹2,000 - ₹8,000',
        verified: false
      }
    ];

    const mockStores: NearbyStore[] = [
      {
        id: '1',
        name: 'Glow Beauty Store',
        logo: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=40&h=40&fit=crop&crop=face',
        category: 'Cosmetics',
        rating: 4.6,
        reviewCount: 234,
        distance: 0.8,
        address: '321 Linking Road, Bandra',
        phone: '+91 98765 43213',
        isOpen: true,
        products: ['Makeup', 'Skincare', 'Hair Care'],
        brands: ['MAC', 'Lakmé', 'Maybelline']
      },
      {
        id: '2',
        name: 'Style Hub',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=40&h=40&fit=crop&crop=face',
        category: 'Fashion',
        rating: 4.5,
        reviewCount: 178,
        distance: 3.2,
        address: '654 Fashion Street, Colaba',
        phone: '+91 98765 43214',
        isOpen: true,
        products: ['Clothing', 'Accessories', 'Shoes'],
        brands: ['Zara', 'H&M', 'Forever 21']
      }
    ];

    // Filter by search radius
    const filteredArtists = mockArtists.filter(artist => artist.distance <= searchRadius);
    const filteredStores = mockStores.filter(store => store.distance <= searchRadius);

    setArtists(filteredArtists);
    setStores(filteredStores);
  };

  // Load nearby artists and stores
  const loadNearbyData = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      generateMockData();
    } catch (error) {
      console.error('Error loading nearby data:', error);
      toast.error('Failed to load nearby locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize location and load data
  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyData();
    }
  }, [userLocation, searchRadius]);

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Nearby Discovery</h2>
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center px-3 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              <Navigation className="w-4 h-4 mr-1" />
              {isLoadingLocation ? 'Locating...' : 'Update Location'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search artists or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('artists')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'artists'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Artists ({filteredArtists.length})
              </button>
              <button
                onClick={() => setActiveTab('stores')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'stores'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stores ({filteredStores.length})
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4 mr-1" />
              {searchRadius}km
            </button>
          </div>

          {/* Radius Filter */}
          {showFilters && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search Radius: {searchRadius}km
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1km</span>
                <span>10km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            <p className="ml-3 text-gray-500">Finding nearby locations...</p>
          </div>
        ) : activeTab === 'artists' ? (
          <div className="space-y-4">
            {filteredArtists.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No artists found nearby</h3>
                <p className="text-gray-600 text-sm">Try increasing your search radius</p>
              </div>
            ) : (
              filteredArtists.map((artist) => (
                <div key={artist.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{artist.name}</h3>
                          {artist.verified && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{artist.specialty}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                          {artist.rating} ({artist.reviewCount} reviews)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1 text-pink-500" />
                        {formatDistance(artist.distance)}
                      </div>
                      <div className={`text-xs mt-1 ${artist.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {artist.isOpen ? 'Open Now' : 'Closed'}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <p className="mb-1">{artist.address}</p>
                    <p>{artist.priceRange}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {artist.services.map((service, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => onArtistSelect(artist)}
                      className="flex-1 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => onBookArtist(artist.id)}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStores.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found nearby</h3>
                <p className="text-gray-600 text-sm">Try increasing your search radius</p>
              </div>
            ) : (
              filteredStores.map((store) => (
                <div key={store.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{store.name}</h3>
                        <p className="text-sm text-gray-600">{store.category}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                          {store.rating} ({store.reviewCount} reviews)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1 text-pink-500" />
                        {formatDistance(store.distance)}
                      </div>
                      <div className={`text-xs mt-1 ${store.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {store.isOpen ? 'Open Now' : 'Closed'}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <p>{store.address}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {store.brands.map((brand, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => onStoreSelect(store)}
                    className="w-full py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                  >
                    Visit Store
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
