import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  User, MapPin, Clock, Link as LinkIcon, 
  Save, Camera, Building, FileText, Phone, Sparkles
} from 'lucide-react';
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

  // Load profile and shop data from Supabase Safely
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', artistId)
          .single();

        if (profileError) throw profileError;
        
        if (!isMounted) return;

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
              setOperatingHours(typeof profileData.operating_hours === 'string' ? JSON.parse(profileData.operating_hours) : profileData.operating_hours);
            } catch {
              setOperatingHours(DEFAULT_OPERATING_HOURS);
            }
          }
        }

        const { data: shopDataResult, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('user_id', artistId)
          .single();

        if (!isMounted) return;

        if (!shopError && shopDataResult) {
          setShopName(shopDataResult.shop_name || '');
          if (!profileData?.bio && shopDataResult.professional_bio) {
            setBio(shopDataResult.professional_bio);
          }
          if (shopDataResult.business_address && !profileData?.city) {
            setCity(shopDataResult.business_address);
          }
          if (shopDataResult.portfolio_link && !profileData?.portfolio_link) {
            setPortfolioLink(shopDataResult.portfolio_link);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load profile data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [artistId]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
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

      toast.success('Profile saved successfully! 🎉');
    } catch (err: any) {
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${artistId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;
      setAvatarUrl(newAvatarUrl);
      
      await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', artistId);

      toast.success('Profile photo updated!');
    } catch (err: any) {
      toast.error('Failed to upload photo');
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

  const toggleDayStatus = (day: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: prev[day as keyof typeof prev] ? null : { start: '09:00', end: '18:00' }
    }));
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-purple-600 animate-pulse" />
        </div>
        <p className="text-slate-500 font-black tracking-widest text-xs uppercase animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 💎 Glass Header & Save Button */}
      <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-2xl p-4 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-4 z-40">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Settings</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveProfile} 
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* 📸 Avatar Section */}
      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
        <div className="relative inline-block group">
          <div className="w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-purple-500 to-fuchsia-500 shadow-xl shadow-purple-500/20">
            <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-purple-200" />
              )}
            </div>
          </div>
          <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg border border-purple-100 cursor-pointer hover:scale-110 transition-transform">
            <Camera className="w-4 h-4 text-purple-600" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={uploadingAvatar}
            className="hidden"
          />
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
          {uploadingAvatar ? 'Uploading magic...' : 'Tap camera icon to change'}
        </p>
      </div>

      {/* 📋 Personal & Business Info */}
      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-500" /> Professional Details
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-white/50 border border-purple-100/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Shop / Brand Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="E.g. Mithas Glow Studio"
              className="w-full bg-white/50 border border-purple-100/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">City / Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Chennai"
                  className="w-full bg-white/50 border border-purple-100/60 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  className="w-full bg-white/50 border border-purple-100/60 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Experience</label>
            <input
              type="text"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="E.g. 5+ Years in Bridal Makeup"
              className="w-full bg-white/50 border border-purple-100/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* ✍️ Bio & Links */}
      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" /> About & Links
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Professional Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your clients what makes your service special..."
              rows={4}
              className="w-full bg-white/50 border border-purple-100/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Instagram / Portfolio URL</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://instagram.com/yourbrand"
                className="w-full bg-white/50 border border-purple-100/60 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ⏰ Premium Operating Hours Setup */}
      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" /> Working Hours
        </h3>
        
        <div className="space-y-3">
          {Object.entries(operatingHours).map(([day, hours]) => {
            const isOpen = hours !== null;
            return (
              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-purple-100/50 bg-white/40 transition-colors hover:bg-white/80">
                <div className="flex items-center justify-between sm:w-32 flex-shrink-0">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">{day.slice(0, 3)}</span>
                  <button 
                    onClick={() => toggleDayStatus(day)}
                    className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider transition-colors ${isOpen ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {isOpen ? 'Open' : 'Closed'}
                  </button>
                </div>

                <div className={`flex items-center gap-2 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <input
                    type="time"
                    value={isOpen ? (hours as any).start : '09:00'}
                    onChange={(e) => handleOperatingHoursChange(day, 'start', e.target.value)}
                    className="bg-white border border-purple-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">TO</span>
                  <input
                    type="time"
                    value={isOpen ? (hours as any).end : '18:00'}
                    onChange={(e) => handleOperatingHoursChange(day, 'end', e.target.value)}
                    className="bg-white border border-purple-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
