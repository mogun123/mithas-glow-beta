import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  User, Mail, Phone, MapPin, Clock, Link as LinkIcon, 
  Upload, Save, Camera, Building, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProfessionalProfileData {
  id: string;
  email: string;
  full_name: string | null;
  shop_name: string | null;
  bio: string | null;
  experience: string | null;
  city: string | null;
  avatar_url: string | null;
  phone: string | null;
  portfolio_link: string | null;
  operating_hours: any | null;
}

interface ShopData {
  id?: string;
  user_id: string;
  shop_name: string | null;
  professional_bio: string | null;
  business_address: string | null;
  business_type: string | null;
  industry: string | null;
  operating_hours: string | null;
  portfolio_link: string | null;
  shop_completed: boolean;
}

interface ProfessionalProfileProps {
  artistId: string;
  onBack?: () => void;
}

const DEFAULT_OPERATING_HOURS = {
  monday: { start: '09:00', end: '18:00' },
  tuesday: { start: '09:00', end: '18:00' },
  wednesday: { start: '09:00', end: '18:00' },
  thursday: { start: '09:00', end: '18:00' },
  friday: { start: '09:00', end: '18:00' },
  saturday: { start: '09:00', end: '18:00' },
  sunday: null,
};

export default function ProfessionalProfile({ artistId, onBack }: ProfessionalProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<ProfessionalProfileData | null>(null);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [operatingHours, setOperatingHours] = useState(DEFAULT_OPERATING_HOURS);

  // Load profile and shop data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', artistId)
          .single();

        if (profileError) throw profileError;
        
        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || '');
          setBio(profileData.bio || '');
          setExperience(profileData.experience || '');
          setCity(profileData.city || '');
          setPhone(profileData.phone || '');
          setAvatarUrl(profileData.avatar_url || '');
          setPortfolioLink(profileData.portfolio_link || '');
          
          if (profileData.operating_hours) {
            try {
              setOperatingHours(JSON.parse(profileData.operating_hours));
            } catch {
              setOperatingHours(profileData.operating_hours);
            }
          }
        }

        // Fetch shop data
        const { data: shopDataResult, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('user_id', artistId)
          .single();

        if (!shopError && shopDataResult) {
          setShopData(shopDataResult);
          setShopName(shopDataResult.shop_name || '');
          if (!profileData?.bio && shopDataResult.professional_bio) {
            setBio(shopDataResult.professional_bio);
          }
          if (shopDataResult.business_address && !city) {
            setCity(shopDataResult.business_address);
          }
          if (shopDataResult.portfolio_link && !portfolioLink) {
            setPortfolioLink(shopDataResult.portfolio_link);
          }
        }
      } catch (err: any) {
        console.error('ProfessionalProfile: Load error:', err.message);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [artistId]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio,
          experience,
          city,
          phone,
          portfolio_link: portfolioLink,
          avatar_url: avatarUrl,
          operating_hours: JSON.stringify(operatingHours),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artistId);

      if (profileError) throw profileError;

      // Update or insert shops table
      const { error: shopError } = await supabase
        .from('shops')
        .upsert({
          user_id: artistId,
          shop_name: shopName,
          professional_bio: bio,
          business_address: city,
          portfolio_link: portfolioLink,
          operating_hours: JSON.stringify(operatingHours),
          shop_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (shopError) throw shopError;

      toast.success('Profile saved successfully!');
    } catch (err: any) {
      console.error('ProfessionalProfile: Save error:', err.message);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${artistId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;
      setAvatarUrl(newAvatarUrl);
      
      // Update profile immediately
      await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', artistId);

      toast.success('Avatar uploaded successfully!');
    } catch (err: any) {
      console.error('ProfessionalProfile: Avatar upload error:', err.message);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleOperatingHoursChange = (day: string, field: 'start' | 'end', value: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: prev[day as keyof typeof prev] 
        ? { ...(prev[day as keyof typeof prev] as any), [field]: value }
        : { start: '09:00', end: '18:00' },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500">Loading profile...</p>
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
              <h1 className="text-xl font-black text-gray-900">Profile Settings</h1>
              <p className="text-xs text-gray-500">Manage your professional information</p>
            </div>
            <div className="flex gap-2">
              {onBack && (
                <Button onClick={onBack} variant="outline" size="sm">
                  Back
                </Button>
              )}
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="bg-[#D4AF37] hover:bg-[#B8962E] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar & Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#D4AF37]" />
              Profile Photo & Name
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-[#D4AF37] flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    <Camera className="w-4 h-4" />
                    {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Contact support to change email</p>
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-[#D4AF37]" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shopName" className="text-sm font-medium">Shop / Business Name</Label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g., Mithas Glow Studio"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="experience" className="text-sm font-medium">Experience</Label>
              <Input
                id="experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g., 5 years, Senior Artist"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-sm font-medium">City / Location</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Mumbai, Delhi"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              Professional Bio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about your expertise, specialties, and approach..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Highlight your certifications, notable work, and what makes you unique.
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Link */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
              Portfolio Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
              placeholder="https://instagram.com/yourprofile or website URL"
            />
            <p className="text-xs text-gray-500 mt-2">
              Link to your Instagram, website, or online portfolio.
            </p>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              Operating Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(operatingHours).map(([day, hours]) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium capitalize text-gray-700">{day}</span>
                {hours ? (
                  <>
                    <Input
                      type="time"
                      value={(hours as any).start || '09:00'}
                      onChange={(e) => handleOperatingHoursChange(day, 'start', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-400">to</span>
                    <Input
                      type="time"
                      value={(hours as any).end || '18:00'}
                      onChange={(e) => handleOperatingHoursChange(day, 'end', e.target.value)}
                      className="w-32"
                    />
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs">Closed</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button (Sticky Bottom for Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:hidden safe-area-bottom">
          <Button 
            onClick={handleSaveProfile} 
            disabled={saving}
            className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}
