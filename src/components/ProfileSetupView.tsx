import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';

import {
  Camera, Sparkles, AtSign, MapPin,
  ChevronRight, Heart, Palette, Scissors,
  Shirt, Gem, Stethoscope, Video,
  Store, CheckCircle2, Building2,
  Package, Link as LinkIcon, Calendar, AlertCircle, Phone, IndianRupee, Plus, Trash2
} from 'lucide-react';

interface ServiceInput {
  id: string;
  title: string;
  price: string;
}

interface ProfileInput {
  username: string;
  displayName: string;
  bio?: string;
  city: string;
  phone: string;
  user_type: 'normal' | 'pro';
  language?: 'en' | 'ta';
  industry?: string;
  profilePic?: string | null;
  dob?: string;
  businessName?: string;
  portfolioLink?: string;
  businessType?: string;
  services: ServiceInput[];
}

export default function ProfileSetupView({ onComplete }: { onComplete?: (data: any) => void }) {
  const { completeProfileSetup } = useGlobalStore();
  const safeOnComplete = onComplete ?? (() => {});
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  const [profile, setProfile] = useState<ProfileInput>({
    username: '',
    displayName: '',
    bio: '',
    city: '',
    phone: '',
    user_type: 'normal',
    language: 'en',
    industry: '',
    businessType: '',
    profilePic: null,
    dob: '',
    businessName: '',
    portfolioLink: '',
    services: [
      { id: '1', title: 'Bridal Makeup', price: '' },
      { id: '2', title: 'Party Makeup', price: '' }
    ]
  });

  const lang = (profile.language as 'en' | 'ta') || 'en';

  useEffect(() => {
    const loadInitialData = async () => {
      setIsHydrating(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const metadataName = user.user_metadata?.display_name || user.user_metadata?.full_name;
        if (metadataName) {
          setProfile(prev => ({ ...prev, displayName: metadataName }));
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, full_name, username, bio, city, phone, dob')
          .eq('id', user.id)
          .single();

        if (profileData) {
          const nameFromProfile = profileData.display_name || profileData.full_name;
          if (nameFromProfile && !profile.displayName) {
            setProfile(prev => ({ ...prev, displayName: nameFromProfile }));
          }
          if (profileData.username) setProfile(prev => ({ ...prev, username: profileData.username }));
          if (profileData.bio) setProfile(prev => ({ ...prev, bio: profileData.bio }));
          if (profileData.city) setProfile(prev => ({ ...prev, city: profileData.city }));
          if (profileData.phone) setProfile(prev => ({ ...prev, phone: profileData.phone }));
          if (profileData.dob) setProfile(prev => ({ ...prev, dob: profileData.dob }));
        }
      } catch (error) {
        console.error('Hydration error:', error);
      } finally {
        setIsHydrating(false);
      }
    };
    loadInitialData();
  }, []);

  const t = {
    en: {
      title: "Ecosystem Entry", subtitle: "Join our fashion ecosystem",
      member: "Glow Member", partner: "Partner Ecosystem",
      next: "Continue Setup", start: "Start Glowing", activate: "Activate Profile",
      city: "City", error: "Username, City, Phone and Date are required", bizError: "Business name is required"
    },
    ta: {
      title: "நுழைவு வாயில்", subtitle: "நமது ஃபேஷன் உலகிற்கு வாருங்கள்",
      member: "க்ளோ உறுப்பினர்", partner: "வணிக கூட்டாளர்",
      next: "தொடரவும்", start: "தொடங்குவோம்", activate: "சுயவிவரத்தை இயக்கு",
      city: "ஊர் / நகரம்", error: "பெயர், ஊர், போன் எண் அவசியம்", bizError: "வணிகப் பெயர் அவசியம்"
    }
  };

  const industries = [
    { id: 'makeup_artist', label: 'Makeup Artist', icon: Palette, type: 'service', desc: 'Bridal & Party' },
    { id: 'boutique_owner', label: 'Boutique Shop', icon: Store, type: 'product', desc: 'Fashion Retailer' },
    { id: 'cosmetic_retailer', label: 'Cosmetic Store', icon: Package, type: 'product', desc: 'Beauty Products' },
    { id: 'fashion_designer', label: 'Designer', icon: Shirt, type: 'service', desc: 'Custom Wear' },
    { id: 'hairstylist', label: 'Hairstylist', icon: Scissors, type: 'service', desc: 'Pro Grooming' },
    { id: 'jewellery_shop', label: 'Jewellery Hub', icon: Gem, type: 'product', desc: 'Gold & Trendy' },
    { id: 'beauty_expert', label: 'Skin Expert', icon: Stethoscope, type: 'service', desc: 'Consultation' },
    { id: 'content_creator', label: 'Influencer', icon: Video, type: 'social', desc: 'Style Hacks' }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setProfile({ ...profile, profilePic: URL.createObjectURL(file) });
  };

  const handleServiceChange = (id: string, field: 'title' | 'price', value: string) => {
    setProfile(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const addService = () => {
    setProfile(prev => ({
      ...prev,
      services: [...prev.services, { id: Date.now().toString(), title: '', price: '' }]
    }));
  };

  const removeService = (id: string) => {
    setProfile(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const submitProfile = async () => {
    setIsLoading(true);
    try {
      const profileData = {
        user_type: profile.user_type,
        username: profile.username,
        display_name: profile.displayName,
        bio: profile.bio,
        city: profile.city,
        phone: profile.phone,
        industry: profile.industry,
        business_type: profile.businessType,
        is_seller: profile.user_type === 'pro',
        seller_status: profile.user_type === 'pro' ? 'pending' : null
      };
      
      const shopData = profile.user_type === 'pro' ? {
        shop_name: profile.businessName || `${profile.displayName}'s Shop`,
        professional_bio: profile.bio,
        portfolio_link: profile.portfolioLink
      } : undefined;

      // Pass services array to globalStore to save in artist_services table
      await completeProfileSetup(profileData, shopData, profile.services);
      
      const isMakeupArtist = profile.industry === 'makeup_artist';
      safeOnComplete(isMakeupArtist ? "professional" : "home");
    } catch (err) {
      console.error(err);
      setError('Failed to complete profile setup');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end mb-4">
        <div className="flex items-center bg-gray-50 p-1 rounded-full border border-gray-100">
          <button onClick={() => setProfile({ ...profile, language: 'en' })} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'en' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}>EN</button>
          <button onClick={() => setProfile({ ...profile, language: 'ta' })} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${lang === 'ta' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}>தமிழ்</button>
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 italic tracking-tight">{t[lang as keyof typeof t].title} ✨</h2>
        <p className="text-sm text-gray-500">{t[lang as keyof typeof t].subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
        <button onClick={() => { setProfile({...profile, user_type: 'normal'}); setStep(2); }} className="p-5 rounded-[2rem] border-2 border-pink-100 bg-white hover:border-pink-300 transition-all text-left flex items-center group">
          <div className="bg-white p-3.5 rounded-2xl shadow-sm group-hover:bg-pink-500 group-hover:text-white transition-all duration-300"><Heart className="w-6 h-6" /></div>
          <div className="ml-4">
            <span className="block font-black text-gray-900 text-lg tracking-tight italic">{t[lang as keyof typeof t].member}</span>
            <span className="text-[10px] text-pink-400 uppercase font-black tracking-widest block">STYLE ENTHUSIAST</span>
          </div>
          <ChevronRight className="ml-auto w-5 h-5 text-pink-200" />
        </button>

        <div className="relative py-4 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative bg-white px-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{t[lang as keyof typeof t].partner}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-4">
          {industries.map((ind) => (
            <button key={ind.id} onClick={() => { setProfile({...profile, user_type: 'pro', industry: ind.id, businessType: ind.type}); setStep(2); }} className="p-4 rounded-3xl border-2 border-gray-50 bg-gray-50/50 flex flex-col items-center text-center hover:border-pink-400 hover:bg-white transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-pink-500 shadow-sm mb-2 group-hover:bg-pink-500 group-hover:text-white transition-all"><ind.icon className="w-6 h-6" /></div>
              <span className="text-[11px] font-black text-gray-800 leading-tight uppercase tracking-tighter">{ind.label}</span>
              <span className="text-[9px] text-gray-400 mt-1 italic">{ind.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col items-center mb-6">
        <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 rounded-full border-4 border-white shadow-xl cursor-pointer overflow-hidden bg-pink-50 flex items-center justify-center">
          {profile.profilePic ? <img src={profile.profilePic} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-pink-300" />}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
        <h3 className="mt-4 font-black text-gray-900 text-lg uppercase tracking-tighter italic">{profile.user_type === 'pro' ? 'Professional' : 'Personal'} Profile</h3>
      </div>

      <div className="space-y-3">
        <div className="relative"><AtSign className="absolute left-3 top-3.5 w-4 h-4 text-pink-400" /><input placeholder="Username" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})}/></div>
        <input placeholder="Display Name" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})}/>
        <div className="relative"><Phone className="absolute left-3 top-3.5 w-4 h-4 text-pink-400" /><input placeholder="Phone Number" type="tel" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative"><MapPin className="absolute left-3 top-4 w-4 h-4 text-pink-400" /><input placeholder={t[lang as keyof typeof t].city} className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})}/></div>
          <div className="relative"><Calendar className="absolute left-3 top-4 w-4 h-4 text-pink-400" /><input type="date" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-[11px] text-gray-400 font-bold uppercase" value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})}/></div>
        </div>
        <textarea placeholder="Short Bio..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none h-20 resize-none text-sm font-medium" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
      </div>

      <button
        onClick={() => {
          if (!profile.username || !profile.city || !profile.phone) {
            setError(t[lang as keyof typeof t].error);
            return;
          }
          if (profile.user_type === "pro") {
            setStep(3);
          } else {
            submitProfile();
          }
        }}
        className="w-full mt-6 py-4 bg-pink-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg shadow-pink-100 uppercase italic tracking-tighter"
      >
        {profile.user_type === 'pro' ? t[lang as keyof typeof t].next : t[lang as keyof typeof t].start}
      </button>
      <button onClick={() => setStep(1)} className="w-full mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Back</button>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-2 bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-100"><Building2 className="w-5 h-5" /></div>
        <h2 className="text-xl font-black uppercase tracking-tighter italic">Business Details</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand / Studio Name</label>
          <input placeholder="e.g. Maya Bridal Studio" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})}/>
        </div>
        <div className="relative"><LinkIcon className="absolute left-3 top-4 w-4 h-4 text-gray-400" /><input placeholder="Portfolio Link (Insta/Website)" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.portfolioLink} onChange={e => setProfile({...profile, portfolioLink: e.target.value})}/></div>
      </div>

      <button
        onClick={() => {
          if (!profile.businessName) {
            setError(t[lang as keyof typeof t].bizError);
            return;
          }
          if (profile.industry === 'makeup_artist') {
            setStep(4);
          } else {
            submitProfile();
          }
        }}
        className="w-full mt-6 py-4 bg-pink-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg shadow-pink-100 uppercase italic tracking-tighter"
      >
        {profile.industry === 'makeup_artist' ? 'Set Prices & Services' : t[lang as keyof typeof t].activate}
      </button>
      <button onClick={() => setStep(2)} className="w-full mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Back</button>
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-100"><IndianRupee className="w-5 h-5" /></div>
        <h2 className="text-xl font-black uppercase tracking-tighter italic">Services & Pricing</h2>
      </div>
      <p className="text-xs text-gray-500 mb-6 font-medium">Add your top services so clients can book directly with transparent pricing.</p>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {profile.services.map((service, index) => (
          <div key={service.id} className="flex space-x-2 items-center bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <input 
              placeholder="Service Name (e.g. HD Makeup)" 
              className="flex-1 p-3 bg-white rounded-xl outline-none text-sm font-bold border border-transparent focus:border-pink-200" 
              value={service.title} 
              onChange={e => handleServiceChange(service.id, 'title', e.target.value)}
            />
            <div className="relative w-28">
              <span className="absolute left-3 top-3 text-gray-400 font-bold">₹</span>
              <input 
                placeholder="Rate" 
                type="number"
                className="w-full pl-7 p-3 bg-white rounded-xl outline-none text-sm font-bold border border-transparent focus:border-pink-200" 
                value={service.price} 
                onChange={e => handleServiceChange(service.id, 'price', e.target.value)}
              />
            </div>
            {index >= 2 && (
              <button onClick={() => removeService(service.id)} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={addService} className="w-full mt-3 py-3 border-2 border-dashed border-pink-200 text-pink-500 font-black rounded-2xl flex items-center justify-center space-x-2 text-sm uppercase hover:bg-pink-50 transition-all">
        <Plus className="w-4 h-4" /> <span>Add Another Service</span>
      </button>

      <button
        onClick={() => {
          const validServices = profile.services.filter(s => s.title && s.price);
          if (validServices.length === 0) {
            setError("Please add at least one service with a price.");
            return;
          }
          submitProfile();
        }}
        className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black rounded-2xl shadow-xl active:scale-95 flex items-center justify-center space-x-2 text-lg uppercase italic tracking-tighter"
      >
        <span>{t[lang as keyof typeof t].activate}</span><CheckCircle2 className="w-5 h-5" />
      </button>
      <button onClick={() => setStep(3)} className="w-full mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fff9fa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(255,182,193,0.4)] p-10 relative overflow-hidden border border-pink-50/50">
        {error && <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] animate-in slide-in-from-top-4"><div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center space-x-3 shadow-xl"><AlertCircle className="w-4 h-4 text-rose-500" /><p className="text-[11px] font-black text-rose-900 leading-tight">{error}</p></div></div>}
        <div className="flex space-x-2 mb-8">
          {[1, 2, 3, 4].filter(i => profile.industry === 'makeup_artist' || i <= 3).map(i => 
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ${step >= i ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-gray-100'}`} />
          )}
        </div>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && profile.industry === 'makeup_artist' && renderStep4()}
        
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500 z-50 p-6 text-center">
            <div className="relative mb-6"><div className="w-20 h-20 border-8 border-pink-50 rounded-full"></div><div className="w-20 h-20 border-8 border-pink-500 border-t-transparent rounded-full animate-spin absolute top-0"></div><Sparkles className="absolute inset-0 m-auto w-10 h-10 text-pink-500 animate-pulse" /></div>
            <h2 className="font-black text-gray-900 text-2xl tracking-[0.15em] italic uppercase leading-none">MITHAS <span className="text-pink-500">GLOW</span></h2>
            <p className="text-[10px] text-gray-400 font-black tracking-[0.4em] uppercase mt-4">{lang === 'en' ? 'Preparing your personalized style feed...' : 'உங்களுக்கான ஃபேஷன் பக்கத்தை தயார் செய்கிறோம்...'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
