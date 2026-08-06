import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  User, MapPin, Clock, Link as LinkIcon, 
  Save, Camera, Building, FileText, Phone, RefreshCw, AlertCircle, 
  CheckCircle, Globe, Instagram, Youtube, Award, Car, Wallet, Heart,
  ShieldCheck, Landmark, Image as ImageIcon, Sun, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// 1. Interfaces & Types (Fix #3)
// ==========================================
interface ProfessionalProfileProps {
  artistId: string;
  onBack?: () => void;
}

interface OperatingHoursDay {
  start: string;
  end: string;
}

type OperatingHours = Record<string, OperatingHoursDay | null>;

interface HoursRowProps {
  day: string;
  hours: OperatingHoursDay | null;
  onChange: (day: string, field: 'start' | 'end', value: string) => void;
  onToggle: (day: string) => void;
}

const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: { start: '09:00', end: '18:00' },
  tuesday: { start: '09:00', end: '18:00' },
  wednesday: { start: '09:00', end: '18:00' },
  thursday: { start: '09:00', end: '18:00' },
  friday: { start: '09:00', end: '18:00' },
  saturday: { start: '09:00', end: '18:00' },
  sunday: null,
};

// ==========================================
// 2. Strict Zod Schema (Fix #4, #8, #11, #12, #14)
// ==========================================
const profileSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  shopName: z.string().min(2, 'Shop name is required'),
  city: z.string().min(2, 'City is required'),
  phone: z.string().regex(/^(?:\+91|91)?[-\s]?[6-9]\d{9}$/, 'Invalid Indian phone number'),
  emergencyContact: z.string().regex(/^(?:\+91|91)?[-\s]?[6-9]\d{9}$/, 'Invalid Indian phone number').optional().or(z.literal('')),
  experience: z.number().min(0).nullable().optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters'),
  languages: z.string().optional(),
  specialities: z.string().optional(),
  certifications: z.string().optional(),
  awards: z.string().optional(),
  
  // KYC & Bank
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST').optional().or(z.literal('')),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN').optional().or(z.literal('')),
  aadhaarVerification: z.string().optional().or(z.literal('')),
  bankAccount: z.string().optional().or(z.literal('')),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional().or(z.literal('')),
  upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI').optional().or(z.literal('')),
  
  // Policies & Availability
  travelPolicy: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  serviceAreas: z.string().optional(),
  maxBookingsPerDay: z.number().min(1).nullable().optional(),
  lunchBreakStart: z.string().optional(),
  lunchBreakEnd: z.string().optional(),
  isVacation: z.boolean().default(false),
  
  // Links
  website: z.string().refine(val => !val || /^https?:\/\//i.test(val), 'Invalid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  whatsapp: z.string().regex(/^(?:\+91|91)?[-\s]?[6-9]\d{9}$/, 'Invalid WhatsApp number').optional().or(z.literal('')),
  googleMapsUrl: z.string().refine(val => !val || /^https?:\/\//i.test(val), 'Invalid URL').optional().or(z.literal('')),
  
  // Pricing
  isBridalSpecialist: z.boolean().default(false),
  isHomeService: z.boolean().default(false),
  travelRadius: z.number().min(0).nullable().optional(),
  travelCharges: z.number().min(0).nullable().optional(),
  startingPrice: z.number().min(0).nullable().optional(),
  
  operatingHours: z.record(z.any())
});

type ProfileFormValues = z.infer<typeof profileSchema>;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ==========================================
// 3. Error Boundary (Fix #7)
// ==========================================
class ProfileErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  resetBoundary = () => this.setState({ hasError: false });
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center bg-rose-50/50 rounded-3xl m-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-black text-slate-800">Module Crashed</h2>
          <button onClick={this.resetBoundary} className="mt-6 px-6 py-2 bg-rose-500 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105">Retry Component</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 4. Memoized Components
// ==========================================
const ProfileSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="h-16 bg-pink-100/50 rounded-3xl w-full"></div>
    <div className="flex justify-center"><div className="w-28 h-28 bg-pink-100/50 rounded-full"></div></div>
    <div className="h-64 bg-pink-100/50 rounded-3xl w-full"></div>
    <div className="h-40 bg-pink-100/50 rounded-3xl w-full"></div>
  </div>
);

const HoursRow = React.memo(function HoursRow({ day, hours, onChange, onToggle }: HoursRowProps) {
  const isOpen = hours !== null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-pink-100/50 bg-white/40 transition-colors hover:bg-white/80">
      <div className="flex items-center justify-between sm:w-32 flex-shrink-0">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700">{day.slice(0, 3)}</span>
        <button type="button" onClick={() => onToggle(day)} className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider transition-colors ${isOpen ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </button>
      </div>
      <div className={`flex items-center gap-2 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <input type="time" value={isOpen ? hours.start : '09:00'} onChange={(e) => onChange(day, 'start', e.target.value)} className="bg-white border border-pink-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-400/40" />
        <span className="text-[10px] font-extrabold text-slate-400">TO</span>
        <input type="time" value={isOpen ? hours.end : '18:00'} onChange={(e) => onChange(day, 'end', e.target.value)} className="bg-white border border-pink-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-400/40" />
      </div>
    </div>
  );
});

// ==========================================
// Main Component
// ==========================================
function ProfessionalProfileContent({ artistId, onBack }: ProfessionalProfileProps) {
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imgError, setImgError] = useState(false); // Fix #9
  const [oldAvatarPath, setOldAvatarPath] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const { control, handleSubmit, reset, watch, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      fullName: '', shopName: '', city: '', phone: '', emergencyContact: '', experience: null, bio: '', languages: '', 
      specialities: '', certifications: '', awards: '', website: '', instagram: '', youtube: '', whatsapp: '', 
      googleMapsUrl: '', isBridalSpecialist: false, isHomeService: false, travelRadius: null, travelCharges: null, 
      startingPrice: null, operatingHours: DEFAULT_OPERATING_HOURS,
      gstNumber: '', panNumber: '', aadhaarVerification: '', bankAccount: '', ifscCode: '', upiId: '',
      travelPolicy: '', cancellationPolicy: '', serviceAreas: '', maxBookingsPerDay: null, lunchBreakStart: '', lunchBreakEnd: '', isVacation: false
    }
  });

  const bioContent = watch('bio') || '';

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);

      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', artistId).maybeSingle().abortSignal(signal),
        supabase.from('shops').select('*').eq('user_id', artistId).maybeSingle().abortSignal(signal)
      ]);

      if (signal.aborted) return;
      if (pRes.error) throw pRes.error;

      const pData = pRes.data || {};
      const sData = sRes.data || {};

      setAvatarUrl(pData.avatar_url || '');
      setImgError(false);
      if (pData.avatar_url) {
        const urlParts = pData.avatar_url.split('/');
        setOldAvatarPath(urlParts[urlParts.length - 1]);
      }

      let parsedHours = DEFAULT_OPERATING_HOURS;
      if (pData.operating_hours) {
        try { parsedHours = typeof pData.operating_hours === 'string' ? JSON.parse(pData.operating_hours) : pData.operating_hours; } catch (e) {}
      }

      reset({
        fullName: pData.full_name || '',
        shopName: sData.shop_name || '',
        city: sData.business_address || pData.city || '',
        phone: pData.phone || '',
        experience: pData.experience ? Number(pData.experience) : null,
        bio: sData.professional_bio || pData.bio || '',
        emergencyContact: sData.emergency_contact || '',
        languages: sData.languages || '',
        specialities: sData.specialities || '',
        certifications: sData.certifications || '',
        awards: sData.awards || '',
        website: sData.website || '',
        instagram: sData.instagram || '',
        youtube: sData.youtube || '',
        whatsapp: sData.whatsapp || '',
        googleMapsUrl: sData.google_maps_url || '',
        isBridalSpecialist: sData.is_bridal_specialist || false,
        isHomeService: sData.is_home_service || false,
        travelRadius: sData.travel_radius ?? null,
        travelCharges: sData.travel_charges ?? null,
        startingPrice: sData.starting_price ?? null,
        operatingHours: parsedHours,
        gstNumber: sData.gst_number || '',
        panNumber: sData.pan_number || '',
        aadhaarVerification: sData.aadhaar_verification || '',
        bankAccount: sData.bank_account || '',
        ifscCode: sData.ifsc_code || '',
        upiId: sData.upi_id || '',
        travelPolicy: sData.travel_policy || '',
        cancellationPolicy: sData.cancellation_policy || '',
        serviceAreas: sData.service_areas || '',
        maxBookingsPerDay: sData.max_bookings_per_day ?? null,
        lunchBreakStart: sData.lunch_break_start || '',
        lunchBreakEnd: sData.lunch_break_end || '',
        isVacation: sData.is_vacation || false
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Failed to load profile data');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [artistId, reset]);

  useEffect(() => {
    loadData();

    // Fix #6: Separate Events for Realtime Performance
    const channel = supabase.channel(`profile_sync_${artistId}`);
    ['INSERT', 'UPDATE', 'DELETE'].forEach(event => {
      channel.on('postgres_changes', { event, schema: 'public', table: 'profiles', filter: `id=eq.${artistId}` }, loadData);
      channel.on('postgres_changes', { event, schema: 'public', table: 'shops', filter: `user_id=eq.${artistId}` }, loadData);
    });
    channel.subscribe();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      supabase.removeChannel(channel);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [artistId, loadData, isDirty]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_WIDTH = 800;
          if (img.width <= MAX_WIDTH) { resolve(file); return; }
          const scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement('canvas');
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/webp', 0.8);
        };
      };
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return toast.error('Invalid file type.');
    if (file.size > MAX_FILE_SIZE) return toast.error('File size exceeds 5MB limit.');

    try {
      setUploadingAvatar(true);
      const compressedBlob = await compressImage(file);
      const fileName = `${artistId}-${Date.now()}.webp`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('profile-images').upload(filePath, compressedBlob, { contentType: 'image/webp' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', artistId);
      if (updateError) throw updateError;
      
      // Fix #5: Added catch logger for orphan deletion
      if (oldAvatarPath) {
        supabase.storage.from('profile-images').remove([`avatars/${oldAvatarPath}`])
          .catch(err => logger.error('Failed to delete old avatar', err));
      }
      
      setAvatarUrl(publicUrl);
      setImgError(false);
      setOldAvatarPath(fileName);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      reset(data, { keepValues: true });
      data.bio = data.bio.trim();
      
      // Fix #13: Social Normalization (remove @ if typed, standard extract)
      const instaMatch = data.instagram?.match(/instagram\.com\/([^/?]+)/);
      const normalizedInsta = instaMatch ? instaMatch[1] : data.instagram?.replace('@', '');
      
      const payload = {
        p_user_id: artistId,
        p_full_name: data.fullName,
        p_shop_name: data.shopName,
        p_city: data.city,
        p_phone: data.phone,
        p_experience: data.experience,
        p_bio: data.bio,
        p_operating_hours: JSON.stringify(data.operatingHours),
        p_emergency_contact: data.emergencyContact,
        p_languages: data.languages,
        p_specialities: data.specialities,
        p_certifications: data.certifications,
        p_awards: data.awards,
        p_website: data.website,
        p_instagram: normalizedInsta,
        p_youtube: data.youtube,
        p_whatsapp: data.whatsapp,
        p_google_maps_url: data.googleMapsUrl,
        p_is_bridal_specialist: data.isBridalSpecialist,
        p_is_home_service: data.isHomeService,
        p_travel_radius: data.travelRadius,
        p_travel_charges: data.travelCharges,
        p_starting_price: data.startingPrice,
        p_gst_number: data.gstNumber,
        p_pan_number: data.panNumber,
        p_aadhaar_verification: data.aadhaarVerification,
        p_bank_account: data.bankAccount,
        p_ifsc_code: data.ifscCode,
        p_upi_id: data.upiId,
        p_travel_policy: data.travelPolicy,
        p_cancellation_policy: data.cancellationPolicy,
        p_service_areas: data.serviceAreas,
        p_max_bookings_per_day: data.maxBookingsPerDay,
        p_lunch_break_start: data.lunchBreakStart,
        p_lunch_break_end: data.lunchBreakEnd,
        p_is_vacation: data.isVacation
      };

      const { error } = await supabase.rpc('update_professional_settings', payload);

      // Fix #1 & #2: Safe Fallback for missing DB columns during rollout
      if (error) {
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('column')) {
          logger.warn('RPC or Column missing, using safe basic fallback sync.');
          await Promise.all([
            supabase.from('profiles').update({ full_name: data.fullName, bio: data.bio, city: data.city, phone: data.phone, experience: data.experience?.toString(), operating_hours: JSON.stringify(data.operatingHours) }).eq('id', artistId),
            supabase.from('shops').upsert({ user_id: artistId, shop_name: data.shopName, business_address: data.city, professional_bio: data.bio, operating_hours: JSON.stringify(data.operatingHours) }, { onConflict: 'user_id' })
          ]);
        } else {
          throw error;
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      toast.success('Profile saved successfully! 🎉');
    } catch (err) {
      toast.error('Save failed. Please retry.');
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 💎 Header & Save UX */}
      <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-2xl p-4 rounded-3xl border border-pink-50 shadow-sm sticky top-4 z-40">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Settings</h2>
          {isDirty && <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase">Unsaved Changes</p>}
        </div>
        <button 
          type="submit"
          disabled={isSubmitting || (!isDirty && !saveSuccess)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-lg text-white ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-pink-500 to-rose-400 shadow-pink-500/30 hover:scale-105 active:scale-95 disabled:opacity-50'}`}
        >
          {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Profile'}
        </button>
      </div>

      {/* Fix #10: Disable entire form when submitting */}
      <fieldset disabled={isSubmitting} className="space-y-6">

        {/* 📸 Avatar */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm text-center flex flex-col items-center">
          <div className="relative group w-28 h-28 aspect-square">
            <div className="w-full h-full rounded-full p-1 bg-gradient-to-tr from-pink-400 to-rose-400">
              <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center">
                {/* Fix #9: Avatar onError Fallback */}
                {avatarUrl && !imgError ? (
                  <img src={avatarUrl} alt="Avatar" onError={() => setImgError(true)} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-pink-200" />
                )}
              </div>
            </div>
            <label className="absolute bottom-0 right-0 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg border border-pink-100 cursor-pointer hover:scale-110">
              <Camera className="w-4 h-4 text-pink-500" />
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="hidden" />
            </label>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">Max Size 5MB (JPG, PNG, WEBP)</p>
        </div>

        {/* 📋 Section 1: Basic Info */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Building className="w-4 h-4 text-pink-500" /> Basic Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Full Name</label>
              <Controller name="fullName" control={control} render={({ field }) => <input {...field} className={`w-full bg-white/50 border rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 ${errors.fullName ? 'border-rose-400' : 'border-pink-100'}`} />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Shop / Studio Name</label>
              <Controller name="shopName" control={control} render={({ field }) => <input {...field} className={`w-full bg-white/50 border rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 ${errors.shopName ? 'border-rose-400' : 'border-pink-100'}`} />} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">City</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <Controller name="city" control={control} render={({ field }) => <input {...field} className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Primary Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <Controller name="phone" control={control} render={({ field }) => <input {...field} type="tel" className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Emergency Contact</label>
              <Controller name="emergencyContact" control={control} render={({ field }) => <input {...field} type="tel" placeholder="Alt Number" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
        </div>

        {/* 🌟 Section 2: Expertise & Bio */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Award className="w-4 h-4 text-pink-500" /> Expertise & Bio</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {/* Fix #14: Experience as Number */}
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Experience (Years)</label>
              <Controller name="experience" control={control} render={({ field: { onChange, ...rest } }) => (
                <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} placeholder="E.g. 5" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />
              )} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Languages Known</label>
              <Controller name="languages" control={control} render={({ field }) => <input {...field} placeholder="English, Tamil, Hindi" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Specialities</label>
            <Controller name="specialities" control={control} render={({ field }) => <input {...field} placeholder="HD Makeup, Airbrush, Hair Styling" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Professional Bio</label>
              <span className={`text-[9px] font-bold ${bioContent.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{bioContent.length}/500</span>
            </div>
            <Controller name="bio" control={control} render={({ field }) => <textarea {...field} rows={4} maxLength={500} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold resize-none" />} />
          </div>
        </div>

        {/* 🛡️ Section 3: KYC & Bank (Fix #11) */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-pink-500" /> Verification & Payouts</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">GST Number</label>
              <Controller name="gstNumber" control={control} render={({ field }) => <input {...field} placeholder="Optional" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold uppercase" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">PAN Number</label>
              <Controller name="panNumber" control={control} render={({ field }) => <input {...field} placeholder="Optional" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold uppercase" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Aadhaar Verification</label>
              <Controller name="aadhaarVerification" control={control} render={({ field }) => <input {...field} placeholder="[Aadhaar Redacted]" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-pink-50 pt-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1 flex items-center gap-1"><Landmark className="w-3 h-3"/> Bank A/C No.</label>
              <Controller name="bankAccount" control={control} render={({ field }) => <input {...field} type="password" placeholder="••••••••" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">IFSC Code</label>
              <Controller name="ifscCode" control={control} render={({ field }) => <input {...field} placeholder="SBIN000XXXX" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold uppercase" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">UPI ID</label>
              <Controller name="upiId" control={control} render={({ field }) => <input {...field} placeholder="name@bank" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
        </div>

        {/* 💰 Section 4: Services, Travel & Pricing */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Wallet className="w-4 h-4 text-pink-500" /> Services & Pricing</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-xl cursor-pointer">
              <Controller name="isBridalSpecialist" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-4 h-4 accent-pink-500" />} />
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-pink-500" /> Bridal Specialist</span>
            </label>
            <label className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-xl cursor-pointer">
              <Controller name="isHomeService" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-4 h-4 accent-pink-500" />} />
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1"><Car className="w-3.5 h-3.5 text-pink-500" /> Home Services</span>
            </label>
          </div>

          {/* Fix #8: Safe null handling for numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Starting Price (₹)</label>
              <Controller name="startingPrice" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Travel Radius (KM)</label>
              <Controller name="travelRadius" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Charge / KM (₹)</label>
              <Controller name="travelCharges" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Service Areas (Comma separated)</label>
            <Controller name="serviceAreas" control={control} render={({ field }) => <input {...field} placeholder="Anna Nagar, T Nagar..." className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
          </div>
        </div>

        {/* 🏖️ Section 5: Availability (Fix #12) */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Sun className="w-4 h-4 text-pink-500" /> Availability & Limits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Max Bookings / Day</label>
              <Controller name="maxBookingsPerDay" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} placeholder="No Limit" className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Lunch Start</label>
              <Controller name="lunchBreakStart" control={control} render={({ field }) => <input type="time" {...field} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase ml-1">Lunch End</label>
              <Controller name="lunchBreakEnd" control={control} render={({ field }) => <input type="time" {...field} className="w-full bg-white/50 border border-pink-100 rounded-2xl px-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 bg-amber-50 px-4 py-3 rounded-2xl cursor-pointer border border-amber-100">
              <Controller name="isVacation" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-5 h-5 accent-amber-500" />} />
              <span className="text-sm font-black text-amber-700">Enable Vacation / Away Mode</span>
            </label>
          </div>
        </div>

        {/* 🔗 Section 6: Social Links & Map */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Globe className="w-4 h-4 text-pink-500" /> Online Presence</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
              <Controller name="instagram" control={control} render={({ field }) => <input {...field} placeholder="Username or Link" className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
            </div>
            <div className="relative">
              <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
              <Controller name="youtube" control={control} render={({ field }) => <input {...field} placeholder="Channel Link" className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
            </div>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
              <Controller name="website" control={control} render={({ field }) => <input {...field} type="url" placeholder="Website URL" className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
              <Controller name="googleMapsUrl" control={control} render={({ field }) => <input {...field} type="url" placeholder="Google Maps Location Link" className="w-full bg-white/50 border border-pink-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold" />} />
            </div>
          </div>
        </div>

        {/* ⏰ Section 7: Working Hours */}
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-3xl border border-pink-50 shadow-sm">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-5 flex items-center gap-2"><Clock className="w-4 h-4 text-pink-500" /> Weekly Schedule</h3>
          <div className="space-y-3">
            <Controller name="operatingHours" control={control} render={({ field: { value, onChange } }) => (
              <>
                {Object.entries(value || {}).map(([day, hours]) => (
                  <HoursRow key={day} day={day} hours={hours} 
                    onChange={(d, f, v) => onChange({ ...value, [d]: { ...value[d]!, [f]: v } })} 
                    onToggle={(d) => onChange({ ...value, [d]: value[d] ? null : { start: '09:00', end: '18:00' } })} 
                  />
                ))}
              </>
            )} />
          </div>
        </div>
      </fieldset>
    </form>
  );
}

// ==========================================
// 5. Export Wrapper (No Suspense - Fix #7)
// ==========================================
export default function ProfessionalProfile(props: ProfessionalProfileProps) {
  return (
    <ProfileErrorBoundary>
      <ProfessionalProfileContent {...props} />
    </ProfileErrorBoundary>
  );
}
