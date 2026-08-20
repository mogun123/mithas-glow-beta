import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ServicesTab from './ServicesTab';
import { Tabs, TabsContent } from '../ui/tabs';
import {
  User, MapPin, Save, Camera, RefreshCw, Clock, DollarSign,
  AlertCircle, CheckCircle, Globe, Instagram, Youtube, Car, Heart,
  Image as ImageIcon, Sparkles, Plus, Trash2, X, Plane, XCircle, MessageCircle, PencilLine, Crown,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfessionalProfileProps {
  artistId: string;
  onBack?: () => void;
}

// Settings nav tabs — order drives swipe direction (left→right index)
const SETTINGS_TABS = [
  { value: 'overview', label: 'Overview', icon: User },
  { value: 'portfolio', label: 'Portfolio', icon: ImageIcon },
  { value: 'services', label: 'Services', icon: Sparkles },
  { value: 'availability', label: 'Availability', icon: Clock },
  { value: 'presence', label: 'Presence', icon: Globe },
  { value: 'verification', label: 'Verification', icon: CheckCircle },
] as const;

const DAY_LABELS = [
  { day: 'monday', label: 'Monday' },
  { day: 'tuesday', label: 'Tuesday' },
  { day: 'wednesday', label: 'Wednesday' },
  { day: 'thursday', label: 'Thursday' },
  { day: 'friday', label: 'Friday' },
  { day: 'saturday', label: 'Saturday' },
  { day: 'sunday', label: 'Sunday' },
];

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
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST').optional().or(z.literal('')),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN').optional().or(z.literal('')),
  aadhaarVerification: z.string().optional().or(z.literal('')),
  bankAccount: z.string().optional().or(z.literal('')),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional().or(z.literal('')),
  upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI').optional().or(z.literal('')),
  travelPolicy: z.string().max(500, 'Travel policy cannot exceed 500 characters').optional(),
  cancellationPolicy: z.string().max(500, 'Cancellation policy cannot exceed 500 characters').optional(),
  serviceAreas: z.string().optional(),
  lunchBreakStart: z.string().optional().or(z.literal('')),
  lunchBreakEnd: z.string().optional().or(z.literal('')),
  isVacation: z.boolean().default(false),
  website: z.string().refine(val => !val || /^https?:\/\//i.test(val), 'Invalid URL').optional().or(z.literal('')),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  whatsapp: z.string().regex(/^(?:\+91|91)?[-\s]?[6-9]\d{9}$/, 'Invalid WhatsApp number').optional().or(z.literal('')),
  googleMapsUrl: z.string().refine(val => !val || /^https?:\/\//i.test(val), 'Invalid URL').optional().or(z.literal('')),
  isBridalSpecialist: z.boolean().default(false),
  isHomeService: z.boolean().default(false),
  travelRadius: z.number().min(0).nullable().optional(),
  travelCharges: z.number().min(0).nullable().optional(),
  startingPrice: z.number().min(0).nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const isRecoverableSchemaError = (error: any) => {
  if (!error) return false;
  const code = error.code || '';
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('not found')
  );
};

const getSchemaErrorMessage = (tableName: string, error: any) => {
  if (isRecoverableSchemaError(error)) {
    return `The database schema is missing or inaccessible for ${tableName}. Apply the SQL migration before using this section.`;
  }
  return error?.message || `Unable to access ${tableName}.`;
};

class ProfileErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  resetBoundary = () => this.setState({ hasError: false });
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-rose-500" />
          <h2 className="text-lg font-black text-slate-900">Module Crashed</h2>
          <button onClick={this.resetBoundary} className="mt-6 rounded-full bg-rose-500 px-6 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:scale-105">Retry Component</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6 p-6">
    <div className="h-16 w-full rounded-3xl bg-pink-100" />
    <div className="flex justify-center"><div className="h-28 w-28 rounded-full bg-pink-100" /></div>
    <div className="h-64 w-full rounded-3xl bg-pink-100" />
    <div className="h-40 w-full rounded-3xl bg-pink-100" />
  </div>
);

function ProfessionalProfileContent({ artistId }: ProfessionalProfileProps) {
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [oldAvatarPath, setOldAvatarPath] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', category: 'bridal', isFeatured: false, service_id: '' });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  
  // Premium Services State
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [showAdvancedServiceOptions, setShowAdvancedServiceOptions] = useState(false);
  const [serviceForm, setServiceForm] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    priceType: 'fixed', 
    advanceAmount: '',
    duration: '60', 
    category: 'bridal',
    whatsIncluded: '',
    addons: '',
    isHomeService: true,
    isActive: true
  });

  const [availabilityRows, setAvailabilityRows] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [verification, setVerification] = useState<any | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [sellerData, setSellerData] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const { control, handleSubmit, reset, watch, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '', shopName: '', city: '', phone: '', emergencyContact: '', experience: null, bio: '', languages: '',
      specialities: '', certifications: '', awards: '', website: '', instagram: '', youtube: '', whatsapp: '', googleMapsUrl: '',
      isBridalSpecialist: false, isHomeService: false, travelRadius: null, travelCharges: null, startingPrice: null,
      gstNumber: '', panNumber: '', aadhaarVerification: '', bankAccount: '', ifscCode: '', upiId: '',
      travelPolicy: '', cancellationPolicy: '', serviceAreas: '', lunchBreakStart: '', lunchBreakEnd: '', isVacation: false
    }
  });

  const bioContent = watch('bio') || '';
  const isVacationActive = watch('isVacation');

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);

      const [pRes, sRes, sellerRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', artistId).maybeSingle().abortSignal(signal),
        supabase.from('shops').select('*').eq('user_id', artistId).maybeSingle().abortSignal(signal),
        supabase.from('sellers').select('*').eq('user_id', artistId).maybeSingle().abortSignal(signal),
      ]);

      if (signal.aborted) return;
      if (pRes.status === 'rejected' || (pRes.status === 'fulfilled' && pRes.value.error)) {
        throw pRes.status === 'rejected' ? pRes.reason : pRes.value.error;
      }
      if (sRes.status === 'fulfilled' && sRes.value.error) {
        throw sRes.value.error;
      }
      if (sellerRes.status === 'fulfilled' && sellerRes.value.error) {
        throw sellerRes.value.error;
      }

      const pData = pRes.value.data || {};
      const sData = sRes.status === 'fulfilled' && !sRes.value.error ? (sRes.value.data || {}) : {};
      const sellerDataResult = sellerRes.status === 'fulfilled' && !sellerRes.value.error ? (sellerRes.value.data || null) : null;
      setSellerData(sellerDataResult);

      setAvatarUrl(pData.avatar_url || '');
      setImgError(false);
      if (pData.avatar_url) {
        const urlParts = pData.avatar_url.split('/');
        setOldAvatarPath(urlParts[urlParts.length - 1]);
      }

      const normalizedValues = {
        fullName: pData.full_name || '',
        shopName: sData.shop_name || sellerDataResult?.shop_name || '',
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
        gstNumber: sData.gst_number || sellerDataResult?.gst_number || '',
        panNumber: sData.pan_number || sellerDataResult?.pan_number || '',
        aadhaarVerification: sData.aadhaar_verification || '',
        bankAccount: sellerDataResult?.bank_account_number || sData.bank_account || '',
        ifscCode: sellerDataResult?.bank_ifsc_code || sData.ifsc_code || '',
        upiId: sellerDataResult?.upi_id || sData.upi_id || '',
        travelPolicy: sData.travel_policy || '',
        cancellationPolicy: sData.cancellation_policy || '',
        serviceAreas: sData.service_areas || '',
        lunchBreakStart: sData.lunch_break_start || '',
        lunchBreakEnd: sData.lunch_break_end || '',
        isVacation: sData.is_vacation || false
      };

      reset(normalizedValues);

      const [portfolioRes, servicesRes, availabilityRes, verificationRes] = await Promise.allSettled([
        supabase.from('artist_portfolio').select('*').eq('artist_id', artistId).order('display_order', { ascending: true }).order('created_at', { ascending: false }).abortSignal(signal),
        supabase.from('artist_services').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }).abortSignal(signal),
        supabase.from('artist_availability').select('*').eq('artist_id', artistId).order('day_of_week', { ascending: true }).abortSignal(signal),
        supabase.from('artist_verification').select('*').eq('artist_id', artistId).maybeSingle().abortSignal(signal),
      ]);

      if (signal.aborted) return;

      const missingTables: string[] = [];
      if (portfolioRes.status === 'fulfilled' && portfolioRes.value.error) {
        if (isRecoverableSchemaError(portfolioRes.value.error)) missingTables.push('artist_portfolio');
        else throw portfolioRes.value.error;
      } else if (portfolioRes.status === 'fulfilled') {
        setPortfolioItems(portfolioRes.value.data || []);
      }

      if (servicesRes.status === 'fulfilled' && servicesRes.value.error) {
        if (isRecoverableSchemaError(servicesRes.value.error)) missingTables.push('artist_services');
        else throw servicesRes.value.error;
      } else if (servicesRes.status === 'fulfilled') {
        setServices(servicesRes.value.data || []);
      }

      if (availabilityRes.status === 'fulfilled' && availabilityRes.value.error) {
        if (isRecoverableSchemaError(availabilityRes.value.error)) missingTables.push('artist_availability');
        else throw availabilityRes.value.error;
      } else if (availabilityRes.status === 'fulfilled') {
        const availabilityData = (availabilityRes.value.data || []) as any[];
        setAvailabilityRows(availabilityData);
      }

      if (verificationRes.status === 'fulfilled' && verificationRes.value.error) {
        if (isRecoverableSchemaError(verificationRes.value.error)) missingTables.push('artist_verification');
        else throw verificationRes.value.error;
      } else if (verificationRes.status === 'fulfilled') {
        const verificationData = verificationRes.value.data as any;
        setVerification(verificationData);
        setVerificationStatus((verificationData?.status as 'pending' | 'verified' | 'rejected') || 'pending');
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('artist_reviews')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (!reviewsError && reviewsData) {
        setReviews(reviewsData);
      } else {
        setReviews([]);
      }

      if (missingTables.length) {
        throw new Error(`Professional profile schema is incomplete. Missing table(s): ${missingTables.join(', ')}. Apply the SQL migration before using this section.`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const message = err?.message || 'Failed to load profile data';
        setLoadError(message);
        toast.error(message);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [artistId, reset]);

  useEffect(() => {
    loadData();

    const channel = supabase.channel(`profile_sync_${artistId}`);
    ['INSERT', 'UPDATE', 'DELETE'].forEach(event => {
      channel.on('postgres_changes', { event, schema: 'public', table: 'profiles', filter: `id=eq.${artistId}` }, loadData);
      channel.on('postgres_changes', { event, schema: 'public', table: 'shops', filter: `user_id=eq.${artistId}` }, loadData);
      channel.on('postgres_changes', { event, schema: 'public', table: 'sellers', filter: `user_id=eq.${artistId}` }, loadData);
    });
    channel.subscribe();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      supabase.removeChannel(channel);
    };
  }, [artistId, loadData]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_WIDTH = 800;
          if (img.width <= MAX_WIDTH) {
            resolve(file);
            return;
          }
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

      if (oldAvatarPath) {
        supabase.storage.from('profile-images').remove([`avatars/${oldAvatarPath}`]).catch(err => logger.error('Failed to delete old avatar', err));
      }

      setAvatarUrl(publicUrl);
      setImgError(false);
      setOldAvatarPath(fileName);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error('Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const persistShopProfile = async (shopPayload: any) => {
    const { data: existingShop, error: selectError } = await supabase.from('shops').select('id').eq('user_id', artistId).maybeSingle();
    if (isRecoverableSchemaError(selectError)) {
      throw new Error(getSchemaErrorMessage('shops', selectError));
    }
    if (selectError) throw selectError;

    if (existingShop?.id) {
      const { error: shopError } = await supabase.from('shops').update(shopPayload).eq('id', existingShop.id);
      if (isRecoverableSchemaError(shopError)) {
        throw new Error(getSchemaErrorMessage('shops', shopError));
      }
      if (shopError) throw shopError;
    } else {
      const { error: shopError } = await supabase.from('shops').insert(shopPayload);
      if (isRecoverableSchemaError(shopError)) {
        throw new Error(getSchemaErrorMessage('shops', shopError));
      }
      if (shopError) throw shopError;
    }
  };

  const persistSellerProfile = async (sellerPayload: any) => {
    const { data: existingSeller, error: selectError } = await supabase.from('sellers').select('id').eq('user_id', artistId).maybeSingle();
    if (isRecoverableSchemaError(selectError)) {
      throw new Error(getSchemaErrorMessage('sellers', selectError));
    }
    if (selectError) throw selectError;

    if (existingSeller?.id) {
      const { error: sellerError } = await supabase.from('sellers').update(sellerPayload).eq('id', existingSeller.id);
      if (isRecoverableSchemaError(sellerError)) {
        throw new Error(getSchemaErrorMessage('sellers', sellerError));
      }
      if (sellerError) throw sellerError;
    } else {
      const { error: sellerError } = await supabase.from('sellers').insert(sellerPayload);
      if (isRecoverableSchemaError(sellerError)) {
        throw new Error(getSchemaErrorMessage('sellers', sellerError));
      }
      if (sellerError) throw sellerError;
    }
  };

  const saveProfileSection = async (data: ProfileFormValues) => {
    setSaveError(null);
    data.bio = data.bio.trim();

    const instaMatch = data.instagram?.match(/instagram\.com\/([^/?]+)/);
    const normalizedInsta = instaMatch ? instaMatch[1] : data.instagram?.replace('@', '');

    const profilePayload = {
      full_name: data.fullName,
      phone: data.phone,
      city: data.city,
      bio: data.bio,
      experience: data.experience,
      display_name: data.shopName,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', artistId);
    if (profileError) throw profileError;

    const shopPayload = {
      user_id: artistId,
      shop_name: data.shopName,
      business_address: data.city,
      professional_bio: data.bio,
      emergency_contact: data.emergencyContact || null,
      languages: data.languages || null,
      specialities: data.specialities || null,
      certifications: data.certifications || null,
      awards: data.awards || null,
      website: data.website || null,
      instagram: normalizedInsta || null,
      youtube: data.youtube || null,
      whatsapp: data.whatsapp || null,
      google_maps_url: data.googleMapsUrl || null,
      is_bridal_specialist: data.isBridalSpecialist,
      is_home_service: data.isHomeService,
      travel_radius: data.travelRadius ?? null,
      travel_charges: data.travelCharges ?? null,
      starting_price: data.startingPrice ?? null,
      travel_policy: data.travelPolicy || null,
      cancellation_policy: data.cancellationPolicy || null,
      service_areas: data.serviceAreas || null,
      lunch_break_start: data.lunchBreakStart || null,
      lunch_break_end: data.lunchBreakEnd || null,
      is_vacation: data.isVacation,
      gst_number: data.gstNumber || null,
      pan_number: data.panNumber || null,
      aadhaar_verification: data.aadhaarVerification || null,
      bank_account: data.bankAccount || null,
      ifsc_code: data.ifscCode || null,
      upi_id: data.upiId || null,
    };

    await persistShopProfile(shopPayload);

    const sellerPayload = {
      user_id: artistId,
      shop_type: 'makeup',
      shop_description: data.bio,
      gst_number: data.gstNumber || null,
      pan_number: data.panNumber || null,
      bank_account_number: data.bankAccount || null,
      bank_ifsc_code: data.ifscCode || null,
      upi_id: data.upiId || null,
      kyc_status: verificationStatus || 'pending',
      is_verified: verificationStatus === 'verified',
    };

    await persistSellerProfile(sellerPayload);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await saveProfileSection(data);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 1800);
      toast.success('Profile saved successfully');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Save failed. Please retry.';
      setSaveError(message);
      toast.error(message);
    }
  };

  const onSubmitVerificationTab = async (data: ProfileFormValues) => {
    try {
      await saveProfileSection(data);
      await handleVerificationSave();
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 1800);
      toast.success('Verification & payout details saved');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Save failed. Please retry.';
      setSaveError(message);
      toast.error(message);
    }
  };

  const handlePortfolioSubmit = async () => {
    try {
      setPortfolioUploading(true);
      const isBeforeAfter = portfolioForm.category === 'before_after';

      if (isBeforeAfter && (!beforeFile || !afterFile)) {
        toast.error("Please select both Before and After images.");
        return;
      }
      if (!isBeforeAfter && !portfolioFile) {
        toast.error("Please select an image.");
        return;
      }

      let imageUrl = null;
      let beforeUrl = null;
      let afterUrl = null;

      const uploadFile = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${artistId}-${prefix}-${Date.now()}.${fileExt}`;
        const filePath = `portfolio/${fileName}`;
        const { error } = await supabase.storage.from('portfolio-images').upload(filePath, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('portfolio-images').getPublicUrl(filePath);
        return data.publicUrl;
      };

      if (isBeforeAfter) {
        beforeUrl = await uploadFile(beforeFile!, 'before');
        afterUrl = await uploadFile(afterFile!, 'after');
      } else {
        imageUrl = await uploadFile(portfolioFile!, 'single');
      }

      const insertPayload = {
        artist_id: artistId,
        title: portfolioForm.title || 'Work Sample',
        description: portfolioForm.description || '',
        category: portfolioForm.category,
        is_featured: portfolioForm.isFeatured,
        service_id: portfolioForm.service_id || null,
        image_url: imageUrl,
        before_image_url: beforeUrl,
        after_image_url: afterUrl,
        display_order: (portfolioItems[0]?.display_order || 0) + 1,
      };

      const { data, error: insertError } = await supabase.from('artist_portfolio').insert(insertPayload).select().single();
      if (insertError) {
        if (isRecoverableSchemaError(insertError)) {
          throw new Error(getSchemaErrorMessage('artist_portfolio', insertError));
        }
        throw insertError;
      }

      setPortfolioItems(prev => [data, ...prev]);
      setPortfolioForm({ title: '', description: '', category: 'bridal', isFeatured: false, service_id: '' });
      setPortfolioFile(null);
      setBeforeFile(null);
      setAfterFile(null);
      toast.success('Portfolio item added successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Portfolio upload failed');
    } finally {
      setPortfolioUploading(false);
    }
  };

  const handlePortfolioDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('artist_portfolio').delete().eq('id', id).eq('artist_id', artistId);
      if (error) throw error;
      setPortfolioItems(prev => prev.filter(item => item.id !== id));
      toast.success('Portfolio item removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove portfolio item');
    }
  };

  const handlePortfolioFeature = async (item: any) => {
    try {
      await supabase.from('artist_portfolio').update({ is_featured: false }).eq('artist_id', artistId);
      const { error } = await supabase.from('artist_portfolio').update({ is_featured: true }).eq('id', item.id);
      if (error) throw error;
      setPortfolioItems(prev => prev.map(entry => ({ ...entry, is_featured: entry.id === item.id })));
      toast.success('Cover image updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update cover image');
    }
  };

  // ==========================================
  // PREMIUM SERVICES LOGIC
  // ==========================================

  const handleServiceEdit = (service: any) => {
    setServiceForm({
      title: service.title,
      description: service.description || '',
      price: service.price?.toString() || '',
      priceType: service.price_type || 'fixed',
      advanceAmount: service.advance_amount?.toString() || '',
      duration: service.duration_minutes?.toString() || '60',
      category: service.category || 'bridal',
      whatsIncluded: service.whats_included || '',
      addons: service.addons || '',
      isHomeService: service.is_home_service ?? true,
      isActive: service.is_active ?? true
    });
    setEditingServiceId(service.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServiceDuplicate = (service: any) => {
    setServiceForm({
      title: `${service.title} (Copy)`,
      description: service.description || '',
      price: service.price?.toString() || '',
      priceType: service.price_type || 'fixed',
      advanceAmount: service.advance_amount?.toString() || '',
      duration: service.duration_minutes?.toString() || '60',
      category: service.category || 'bridal',
      whatsIncluded: service.whats_included || '',
      addons: service.addons || '',
      isHomeService: service.is_home_service ?? true,
      isActive: false 
    });
    setEditingServiceId(null);
    setShowAdvancedServiceOptions(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Service duplicated. Edit details and save.');
  };

  const handleCancelServiceEdit = () => {
    setServiceForm({ 
      title: '', description: '', price: '', priceType: 'fixed', 
      advanceAmount: '', duration: '60', category: 'bridal', 
      whatsIncluded: '', addons: '', isHomeService: true, isActive: true 
    });
    setEditingServiceId(null);
    setShowAdvancedServiceOptions(false);
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('artist_services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId);
      
      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_active: !currentStatus } : s));
      toast.success(currentStatus ? 'Service hidden from customers' : 'Service is now live!');
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

      const handleServiceSave = async () => {
    // 1. Safety Check: Artist ID இருக்கிறதா என சரிபார்க்க
    if (!artistId) {
      toast.error('Artist ID is missing! Please refresh the page.');
      return;
    }

    // DEBUG: Log the artist_id being used for insert
    console.log('DEBUG: attempting insert with artist_id =', artistId);

    if (!serviceForm.title || !serviceForm.price) {
      toast.error('Service Title and Price are required');
      return;
    }

    try {
      setServicesLoading(true);
      
      const payload: any = {
        artist_id: artistId,
        title: serviceForm.title,
        description: serviceForm.description,
        price: Number(serviceForm.price),
        price_type: serviceForm.priceType || 'fixed',
        advance_amount: serviceForm.advanceAmount ? Number(serviceForm.advanceAmount) : null,
        duration_minutes: Number(serviceForm.duration) || 60,
        category: serviceForm.category || 'bridal',
        whats_included: serviceForm.whatsIncluded || '',
        addons: serviceForm.addons || '',
        is_home_service: serviceForm.isHomeService ?? true,
        is_active: serviceForm.isActive ?? true,
      };

      if (editingServiceId) {
        // UPDATE Existing Service
        const { data, error } = await supabase.from('artist_services').update(payload).eq('id', editingServiceId).select().single();
        if (error) throw error;
        
        setServices(prev => prev.map(s => s.id === editingServiceId ? data : s));
        toast.success('Service updated successfully!');
      } else {
        // 🔥 THE ULTIMATE FIX: 100% Working Random ID Generator (No crypto error)
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        payload.id = generateUUID(); // நாமே ID ஐ உருவாக்கி அனுப்புகிறோம்!

        // INSERT New Service
        const { data, error } = await supabase.from('artist_services').insert(payload).select().single();
        if (error) throw error;
        
        setServices(prev => [data, ...prev]);
        toast.success('New service published successfully!');
      }
      
      handleCancelServiceEdit();
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error(err?.message || 'Failed to save service');
    } finally {
      setServicesLoading(false);
    }
  };



  const handleServiceDelete = async (serviceId: string) => {
    if (!window.confirm("Are you sure you want to remove this service?")) return;
    
    try {
      const { error } = await supabase.from('artist_services').delete().eq('id', serviceId).eq('artist_id', artistId);
      if (error) throw error;
      setServices(prev => prev.filter(item => item.id !== serviceId));
      toast.success('Service removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove service');
    }
  };

  // ==========================================

  const updateAvailabilityRow = (index: number, field: string, value: any) => {
    setAvailabilityRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const handleAvailabilitySave = async () => {
    try {
      setAvailabilityLoading(true);
      for (const row of availabilityRows) {
        const payload = {
          artist_id: artistId,
          day_of_week: row.day_of_week,
          start_time: row.start_time || '09:00',
          end_time: row.end_time || '18:00',
          is_working_day: row.is_working_day ?? true,
          break_start: row.break_start || null,
          break_end: row.break_end || null,
          slot_duration_minutes: Number(row.slot_duration_minutes || 60),
          max_bookings_per_day: Number(row.max_bookings_per_day || 1),
          is_blocked: row.is_blocked || false,
          block_reason: row.block_reason || null,
        };
        if (row.id) {
          const { error } = await supabase.from('artist_availability').update(payload).eq('id', row.id);
          if (error) {
            if (isRecoverableSchemaError(error)) {
              toast.error('Availability storage is not enabled for this workspace yet.');
              return;
            }
            throw error;
          }
        } else {
          const { error } = await supabase.from('artist_availability').insert(payload);
          if (error) {
            if (isRecoverableSchemaError(error)) {
              toast.error('Availability storage is not enabled for this workspace yet.');
              return;
            }
            throw error;
          }
        }
      }
      toast.success('Availability updated');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleVerificationSave = async () => {
    try {
      setVerificationLoading(true);
      const payload = {
        artist_id: artistId,
        status: verificationStatus,
      };
      if (verification?.id) {
        const { error } = await supabase.from('artist_verification').update(payload).eq('id', verification.id);
        if (error) {
          if (isRecoverableSchemaError(error)) {
            toast.error('Verification storage is not enabled for this workspace yet.');
            return;
          }
          throw error;
        }
      } else {
        const { error } = await supabase.from('artist_verification').insert(payload);
        if (error) {
          if (isRecoverableSchemaError(error)) {
            toast.error('Verification storage is not enabled for this workspace yet.');
            return;
          }
          throw error;
        }
      }
      setVerification(prev => prev ? { ...prev, status: verificationStatus } : { artist_id: artistId, status: verificationStatus });
    } catch (err: any) {
      toast.error(err?.message || 'Verification update failed');
      throw err;
    } finally {
      setVerificationLoading(false);
    }
  };

  // ---- Swipeable settings nav (UI-only; drives the same activeTab/setActiveTab used everywhere else) ----
  const currentTabIndex = Math.max(0, SETTINGS_TABS.findIndex((t) => t.value === activeTab));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeStartXRef = useRef(0);

  const goToSettingsTab = (newIndex: number) => {
    const clamped = (newIndex + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    setActiveTab(SETTINGS_TABS[clamped].value);
  };

  const handleSwipeStart = (clientX: number) => {
    swipeStartXRef.current = clientX;
    setIsDragging(true);
  };
  const handleSwipeMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - swipeStartXRef.current);
  };
  const handleSwipeEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset < -40) {
      goToSettingsTab(currentTabIndex + 1); // swiped right→left: next
    } else if (dragOffset > 40) {
      goToSettingsTab(currentTabIndex - 1); // swiped left→right: previous
    }
    setDragOffset(0);
  };

  if (loading) return <ProfileSkeleton />;

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-rose-500" />
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        <button onClick={() => void loadData()} className="mt-4 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-24 duration-500 relative z-10">
      {/* Unified header + tabs — single card, no duplicate layout */}
      <div className="mb-6 rounded-3xl border border-pink-100 bg-pink-50 p-4 shadow-sm relative z-10">
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Professional Settings</h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Live profile, portfolio, services, availability and payouts</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Swipeable settings nav — swipe the card itself left/right, no buttons needed */}
          <div className="relative z-20 px-7">
            <ChevronLeft className="pointer-events-none absolute left-0 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-white p-1 text-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.18)] animate-pulse" />
            <ChevronRight className="pointer-events-none absolute right-0 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-white p-1 text-pink-500 shadow-[0_0_0_2px_rgba(236,72,153,0.18)] animate-pulse" />

            <div
              className="touch-pan-y select-none overflow-hidden rounded-2xl"
              onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX)}
              onTouchEnd={handleSwipeEnd}
              onMouseDown={(e) => handleSwipeStart(e.clientX)}
              onMouseMove={(e) => handleSwipeMove(e.clientX)}
              onMouseUp={handleSwipeEnd}
              onMouseLeave={() => isDragging && handleSwipeEnd()}
            >
              <div
                className="flex cursor-grab items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2.5 text-white shadow-md active:cursor-grabbing"
                style={{
                  transform: `translateX(${dragOffset}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                }}
              >
                {React.createElement(SETTINGS_TABS[currentTabIndex].icon, { className: 'h-3.5 w-3.5' })}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {SETTINGS_TABS[currentTabIndex].label}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5">
              {SETTINGS_TABS.map((tab, i) => (
                <span
                  key={tab.value}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentTabIndex ? 'w-4 bg-gradient-to-r from-pink-500 to-purple-600' : 'w-1.5 bg-pink-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <TabsContent value="overview">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-3xl border border-pink-100 bg-pink-50 p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Profile Overview</h3>
                      <p className="mt-1 text-xs text-slate-500">Core business details and service positioning.</p>
                    </div>
                    <button type="submit" disabled={isSubmitting || (!isDirty && !saveSuccess)} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-pink-500 to-rose-400 shadow-pink-200 hover:scale-105'}`}>
                      {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : saveSuccess ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Overview'}
                    </button>
                  </div>

                  {saveError && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{saveError}</div>}

                  <div className="flex flex-col items-center gap-4 rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-6 text-center">
                    <div className="relative h-28 w-28">
                      <div className="h-full w-full rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 p-1">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-pink-50">
                          {avatarUrl && !imgError ? <img src={avatarUrl} alt="Avatar" onError={() => setImgError(true)} className="h-full w-full object-cover" /> : <User className="h-12 w-12 text-pink-200" />}
                        </div>
                      </div>
                      <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-pink-200 bg-pink-50 shadow-lg hover:scale-110">
                        <Camera className="h-4 w-4 text-pink-500" />
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile photo</p>
                      <p className="text-xs text-slate-500">PNG, JPG or WEBP up to 5MB</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Full Name</label>
                      <Controller name="fullName" control={control} render={({ field }) => <input {...field} className={`w-full rounded-2xl border bg-pink-50 px-4 py-3 text-sm font-bold ${errors.fullName ? 'border-rose-400' : 'border-pink-200'}`} />} />
                      {errors.fullName && <p className="mt-1 ml-1 text-[10px] font-bold text-rose-500">{errors.fullName.message}</p>}
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Shop / Studio Name</label>
                      <Controller name="shopName" control={control} render={({ field }) => <input {...field} className={`w-full rounded-2xl border bg-pink-50 px-4 py-3 text-sm font-bold ${errors.shopName ? 'border-rose-400' : 'border-pink-200'}`} />} />
                      {errors.shopName && <p className="mt-1 ml-1 text-[10px] font-bold text-rose-500">{errors.shopName.message}</p>}
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">City</label>
                      <Controller name="city" control={control} render={({ field }) => <input {...field} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Primary Phone</label>
                      <Controller name="phone" control={control} render={({ field }) => <input {...field} type="tel" className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                      {errors.phone && <p className="mt-1 ml-1 text-[10px] font-bold text-rose-500">{errors.phone.message}</p>}
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Emergency Contact</label>
                      <Controller name="emergencyContact" control={control} render={({ field }) => <input {...field} type="tel" className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Experience (Years)</label>
                      <Controller name="experience" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Professional Bio</label>
                      <span className={`text-[9px] font-bold ${bioContent.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{bioContent.length}/500</span>
                    </div>
                    <Controller name="bio" control={control} render={({ field }) => <textarea {...field} rows={4} maxLength={500} className="w-full resize-none rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Languages Known</label>
                      <Controller name="languages" control={control} render={({ field }) => <input {...field} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Specialities</label>
                      <Controller name="specialities" control={control} render={({ field }) => <input {...field} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Starting Price (₹)</label>
                      <Controller name="startingPrice" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Travel Radius (KM)</label>
                      <Controller name="travelRadius" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Charge / KM (₹)</label>
                      <Controller name="travelCharges" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-pink-50 px-4 py-2">
                      <Controller name="isBridalSpecialist" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="h-4 w-4 accent-pink-500" />} />
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-700"><Heart className="h-3.5 w-3.5 text-pink-500" /> Bridal Specialist</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-pink-50 px-4 py-2">
                      <Controller name="isHomeService" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="h-4 w-4 accent-pink-500" />} />
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-700"><Car className="h-3.5 w-3.5 text-pink-500" /> Home Services</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-pink-100 bg-pink-50 p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Booking Policies</h3>
                    <p className="mt-1 text-xs text-slate-500">Lunch break, vacation mode, travel and cancellation terms shown to clients.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Lunch Break Start</label>
                      <Controller name="lunchBreakStart" control={control} render={({ field }) => <input {...field} type="time" className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                    <div>
                      <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Lunch Break End</label>
                      <Controller name="lunchBreakEnd" control={control} render={({ field }) => <input {...field} type="time" className="w-full rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Travel Policy</label>
                    <Controller name="travelPolicy" control={control} render={({ field }) => <textarea {...field} rows={2} maxLength={500} placeholder="e.g. Travel charges apply beyond 10km, advance booking required" className="w-full resize-none rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                  </div>

                  <div className="mt-4">
                    <label className="ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Cancellation Policy</label>
                    <Controller name="cancellationPolicy" control={control} render={({ field }) => <textarea {...field} rows={2} maxLength={500} placeholder="e.g. Free cancellation up to 24 hours before appointment" className="w-full resize-none rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold" />} />
                  </div>

                  <div className="mt-4">
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 ${isVacationActive ? 'bg-amber-50' : 'bg-pink-50'}`}>
                      <Controller name="isVacation" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="h-4 w-4 accent-amber-500" />} />
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <Plane className="h-3.5 w-3.5 text-amber-500" /> On Vacation (pause new bookings)
                      </span>
                    </label>
                    {isVacationActive && (
                      <p className="mt-2 ml-1 flex items-center gap-1 text-[10px] font-bold text-amber-600">
                        <XCircle className="h-3 w-3" /> Clients will see you as unavailable until this is turned off.
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="portfolio">
              <div className="space-y-6 rounded-3xl border border-pink-100 bg-pink-50 p-6 shadow-sm">

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Portfolio & Asset Gallery</h3>
                    <p className="mt-1 text-xs text-slate-500">Showcase your best makeup transformations to attract clients.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast.info("Opening Live Client View...")}
                      className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-pink-600 hover:bg-pink-100"
                    >
                      <Globe className="h-3.5 w-3.5" /> Preview Client View
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-pink-200 bg-pink-50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Add New Work Sample</span>
                    <label className="flex items-center gap-2 text-xs font-bold text-pink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={portfolioForm.category === 'before_after'}
                        onChange={(e) => {
                          setPortfolioForm(prev => ({ ...prev, category: e.target.checked ? 'before_after' : 'bridal' }));
                          setPortfolioFile(null); setBeforeFile(null); setAfterFile(null);
                        }}
                        className="h-4 w-4 accent-pink-500 rounded"
                      />
                      Before / After Mode
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={portfolioForm.title}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Image Title (e.g. Royal HD Bridal Look)"
                      className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold outline-none focus:border-pink-400"
                    />
                    <input
                      value={portfolioForm.description}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Caption / Client Story"
                      className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold outline-none focus:border-pink-400"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={portfolioForm.category}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, category: e.target.value }))}
                      className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold outline-none"
                    >
                      <option value="bridal">Bridal Makeup</option>
                      <option value="party">Party Look</option>
                      <option value="engagement">Engagement</option>
                      <option value="reception">Reception</option>
                      <option value="before_after">Before & After</option>
                      <option value="celebrity">Celebrity / Fashion</option>
                    </select>

                    <select
                      value={portfolioForm.service_id || ''}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, service_id: e.target.value }))}
                      className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold outline-none"
                    >
                      <option value="">Link to Service Package (Optional)</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.title} - ₹{s.price}</option>
                      ))}
                    </select>

                    <label className="flex items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={portfolioForm.isFeatured}
                        onChange={(e) => setPortfolioForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="h-4 w-4 accent-pink-500 rounded"
                      />
                      Set as Cover Photo
                    </label>
                  </div>

                  {portfolioForm.category === 'before_after' ? (
                    <div className="grid gap-3 md:grid-cols-2 mt-4">
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-2xl bg-pink-50 cursor-pointer hover:bg-pink-50 transition">
                        <span className="text-[10px] font-black uppercase text-pink-500 mb-1">1. Before Image</span>
                        {beforeFile ? <span className="text-xs font-bold text-slate-900">{beforeFile.name}</span> : <span className="text-[10px] text-slate-400">Click to browse</span>}
                        <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-2xl bg-pink-50 cursor-pointer hover:bg-pink-50 transition">
                        <span className="text-[10px] font-black uppercase text-pink-500 mb-1">2. After Image</span>
                        {afterFile ? <span className="text-xs font-bold text-slate-900">{afterFile.name}</span> : <span className="text-[10px] text-slate-400">Click to browse</span>}
                        <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-2xl bg-pink-50 cursor-pointer hover:bg-pink-50 transition">
                        <span className="text-[10px] font-black uppercase text-pink-500 mb-1">Work Image</span>
                        {portfolioFile ? <span className="text-xs font-bold text-slate-900">{portfolioFile.name}</span> : <span className="text-[10px] text-slate-400">Click to browse</span>}
                        <input type="file" accept="image/*" onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePortfolioSubmit}
                    disabled={portfolioUploading}
                    className="w-full flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-pink-100 hover:scale-[1.01] transition-all disabled:opacity-50"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>{portfolioUploading ? 'Uploading Image...' : 'Save to Portfolio'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {['all', 'bridal', 'party', 'before_after', 'engagement'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPortfolioFilter(cat)}
                      className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${portfolioFilter === cat ? 'bg-pink-500 text-white shadow-md' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {portfolioItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50/60 text-center">
                    <Sparkles className="h-10 w-10 text-pink-600 mb-2" />
                    <p className="text-xs font-bold text-slate-600">No portfolio images uploaded yet.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Upload your work samples above to show clients your talent!</p>
                  </div>
                ) : (
 
