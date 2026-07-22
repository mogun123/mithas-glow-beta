import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalStore } from '../lib/globalStore';

import { 
  Camera, Sparkles, AtSign, MapPin, 
  ChevronRight, Heart, Palette, Scissors, 
  Shirt, Gem, Stethoscope, Video, 
  Store, CheckCircle2, Building2,
  Package, Clock, Link as LinkIcon, Calendar, AlertCircle, ChevronDown
} from 'lucide-react';

interface ProfileInput {
  username: string;
  displayName: string;
  bio?: string;
  city: string;
  phone: string;
  user_type: 'normal' | 'pro';
  language?: 'en' | 'ta';
  accountType?: string;
  industry?: string;
  profilePic?: string | null;
  dob?: string;
  businessName?: string;
  portfolioLink?: string;
  businessType?: string;
  experience?: string;
  operatingHours?: string;
  // Pro user additional fields
  shop_name?: string;
  business_address?: string;
  professional_bio?: string;
  gst_number?: string;
}

interface ProfileData {
    accountType: string;
      industry: string;
        profilePic: string | null;
          displayName: string;
            username: string;
              bio: string;
                gender: string;
                  dob: string;
                    businessName: string;
                      portfolioLink: string;
                        city: string;
                          storeAddress: string;
                            specialties: string;
                              businessType: string;
                                experience: string;
                                  operatingHours: string;
                                    glowPoints: number;
                                      language: 'en' | 'ta';
                                        profileCompleted: boolean;
                                          phone?: string;   // ✅ ADD THIS

                                          }


// ProfileSetupView.tsx - Line 38
export default function ProfileSetupView({ onComplete, userEmail }: { onComplete?: (data: any) => void, userEmail?: string }) {
  const { completeProfileSetup, setUser, setShop } = useGlobalStore();
  const safeOnComplete = onComplete ?? (() => {});
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileInput>({
    username: '',
    displayName: '',
    bio: '',
    city: '',
    phone: '',
    user_type: 'normal',
    shop_name: '',
    business_address: '',
    professional_bio: '',
    gst_number: '',
    language: 'en',
    accountType: '',
    industry: '',
    businessType: '',
    profilePic: null,
    dob: '',
    businessName: '',
    portfolioLink: '',
    experience: '',
    operatingHours: ''
  });

  const lang = (profile.language as 'en' | 'ta') || 'en';
  const storageKey = userEmail ? `mithub_profile_${userEmail}` : 'mithub_profile';

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: ProfileData = JSON.parse(saved);
        if (parsed.profileCompleted) {
          safeOnComplete();
        } else {
          setProfile(parsed);
        }
      } catch (e) { console.error("Parse error"); }
    }
  }, [safeOnComplete, storageKey]);

  const t = {
    en: {
      title: "Ecosystem Entry", subtitle: "Join our fashion ecosystem",
      member: "Glow Member", partner: "Partner Ecosystem",
      next: "Continue Setup", start: "Start Glowing", activate: "Activate Profile",
      city: "City", error: "Username, City and Date are required", bizError: "Business name is required"
    },
    ta: {
      title: "நுழைவு வாயில்", subtitle: "நமது ஃபேஷன் உலகிற்கு வாருங்கள்",
      member: "க்ளோ உறுப்பினர்", partner: "வணிக கூட்டாளர்",
      next: "தொடரவும்", start: "தொடங்குவோம்", activate: "சுயவிவரத்தை இயக்கு",
      city: "ஊர் / நகரம்", error: "பெயர், ஊர் மற்றும் தேதி அவசியம்", bizError: "வணிகப் பெயர் அவசியம்"
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
        <button onClick={() => { setProfile({...profile, accountType: 'normal'}); setStep(2); }} className="p-5 rounded-[2rem] border-2 border-pink-100 bg-white hover:border-pink-300 transition-all text-left flex items-center group">
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
            <button key={ind.id} onClick={() => { setProfile({...profile, accountType: 'pro', industry: ind.id, businessType: ind.type}); setStep(2); }} className="p-4 rounded-3xl border-2 border-gray-50 bg-gray-50/50 flex flex-col items-center text-center hover:border-pink-400 hover:bg-white transition-all group">
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
        <h3 className="mt-4 font-black text-gray-900 text-lg uppercase tracking-tighter italic">{profile.accountType} Profile</h3>
      </div>

      <div className="space-y-3">
        <div className="relative"><AtSign className="absolute left-3 top-3.5 w-4 h-4 text-pink-400" /><input placeholder="Username" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})}/></div>
        <input placeholder="Display Name" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})}/>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative"><MapPin className="absolute left-3 top-4 w-4 h-4 text-pink-400" /><input placeholder={t[lang as keyof typeof t].city} className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})}/></div>
          <div className="relative"><Calendar className="absolute left-3 top-4 w-4 h-4 text-pink-400" /><input type="date" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-[11px] text-gray-400 font-bold uppercase" value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})}/></div>
        </div>
        <textarea placeholder="Short Bio..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none h-20 resize-none text-sm font-medium" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
      </div>

      <button
        onClick={async () => {
          if (!profile.username || !profile.city || !profile.dob) {
            setError(t[lang as keyof typeof t].error);
            return;
          }

          if (profile.accountType === "pro") {
            setStep(3);
            return;
          }

          setIsLoading(true);
          try {
            const profileData = {
              user_type: 'normal' as const,
              username: profile.username,
              display_name: profile.displayName,
              bio: profile.bio,
              city: profile.city,
              phone: profile.phone,
              is_seller: false,
              seller_status: null
            };
            await completeProfileSetup(profileData);
            safeOnComplete();
          } catch (err) {
            console.error(err);
            setError('Failed to complete profile setup');
          } finally {
            setIsLoading(false);
          }
        }}
        className="w-full mt-6 py-4 bg-pink-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-lg shadow-pink-100 uppercase italic tracking-tighter"
      >
        {profile.accountType === 'pro' ? t[lang as keyof typeof t].next : t[lang as keyof typeof t].start}
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
        <div className="relative"><LinkIcon className="absolute left-3 top-4 w-4 h-4 text-gray-400" /><input placeholder="Portfolio Link" className="w-full pl-10 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium" value={profile.portfolioLink} onChange={e => setProfile({...profile, portfolioLink: e.target.value})}/></div>
      </div>

      <button
        onClick={async () => {
          if (!profile.businessName) {
            setError(t[lang as keyof typeof t].bizError);
            return;
          }

          setIsLoading(true);
          try {
            const profileData = {
              user_type: 'pro' as const,
              username: profile.username,
              display_name: profile.displayName,
              bio: profile.bio,
              city: profile.city,
              phone: profile.phone,
              industry: profile.industry,
              business_type: profile.businessType,
              is_seller: true,
              seller_status: 'pending'
            };
            const shopData = {
              shop_name: profile.businessName || `${profile.displayName}'s Shop`,
              professional_bio: profile.bio,
              portfolio_link: profile.portfolioLink
            };
            await completeProfileSetup(profileData, shopData);
            safeOnComplete();
          } catch (err) {
            console.error(err);
            setError('Failed to complete profile setup');
          } finally {
            setIsLoading(false);
          }
        }}
        className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black rounded-2xl shadow-xl active:scale-95 flex items-center justify-center space-x-2 text-lg uppercase italic tracking-tighter"
      >
        <span>{t[lang as keyof typeof t].activate}</span><CheckCircle2 className="w-5 h-5" />
      </button>
      <button onClick={() => setStep(2)} className="w-full mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fff9fa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(255,182,193,0.4)] p-10 relative overflow-hidden border border-pink-50/50">
        {error && <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] animate-in slide-in-from-top-4"><div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center space-x-3 shadow-xl"><AlertCircle className="w-4 h-4 text-rose-500" /><p className="text-[11px] font-black text-rose-900 leading-tight">{error}</p></div></div>}
        <div className="flex space-x-2 mb-8">{[1, 2, 3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ${step >= i ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-gray-100'}`} />)}</div>
        {step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}
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




































