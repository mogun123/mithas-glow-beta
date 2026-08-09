import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  User, MapPin, Save, Camera, RefreshCw, Clock, DollarSign,
  AlertCircle, CheckCircle, Globe, Instagram, Youtube, Car, Heart,
  Image as ImageIcon, Sparkles, Plus, Trash2, X, Plane, XCircle, MessageCircle, PencilLine,
  Check, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfessionalProfileProps {
  artistId: string;
  onBack?: () => void;
}

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
    code === '42P01' || code === 'PGRST205' || code === 'PGRST204' || code === '42703' ||
    message.includes('does not exist') || message.includes('relation') || message.includes('column') || message.includes('not found')
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
  static getDerivedStateFromError() { return { hasError: true }; }
  resetBoundary = () => this.setState({ hasError: false });
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 flex min-h-[50vh] flex-col items-center justify-center rounded-[32px] border border-rose-100 bg-rose-50/50 p-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-rose-500" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Module Crashed</h2>
          <button onClick={this.resetBoundary} className="mt-6 rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-rose-600 shadow-sm">Retry Component</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6 p-4 sm:p-6">
    <div className="h-16 w-full rounded-[24px] bg-slate-100" />
    <div className="flex justify-center"><div className="h-28 w-28 rounded-full bg-slate-100" /></div>
    <div className="h-64 w-full rounded-[24px] bg-slate-100" />
    <div className="h-40 w-full rounded-[24px] bg-slate-100" />
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
  
  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', category: 'bridal', isFeatured: false, service_id: '' });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Premium Services State
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [showAdvancedServiceOptions, setShowAdvancedServiceOptions] = useState(false);
  const [serviceForm, setServiceForm] = useState({ 
    title: '', description: '', price: '', priceType: 'fixed', advanceAmount: '',
    duration: '60', category: 'bridal', whatsIncluded: '', addons: '', isHomeService: true, isActive: true
  });

  const [availabilityRows, setAvailabilityRows] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [verification, setVerification] = useState<any | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [sellerData, setSellerData] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);

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
      setLoading(true); setLoadError(null); setSaveError(null);

      const [pRes, sRes, sellerRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', artistId).maybeSingle().abortSignal(signal),
        supabase.from('shops').select('*').eq('user_id', artistId).maybeSingle().abortSignal(signal),
        supabase.from('sellers').select('*').eq('user_id', artistId).maybeSingle().abortSignal(signal),
      ]);

      if (signal.aborted) return;
      if (pRes.status === 'rejected' || (pRes.status === 'fulfilled' && pRes.value.error)) throw pRes.status === 'rejected' ? pRes.reason : pRes.value.error;
      if (sRes.status === 'fulfilled' && sRes.value.error) throw sRes.value.error;
      if (sellerRes.status === 'fulfilled' && sellerRes.value.error) throw sellerRes.value.error;

      const pData = pRes.value?.data || {};
      const sData = sRes.status === 'fulfilled' && !sRes.value?.error ? (sRes.value.data || {}) : {};
      const sellerDataResult = sellerRes.status === 'fulfilled' && !sellerRes.value?.error ? (sellerRes.value.data || null) : null;
      setSellerData(sellerDataResult);

      setAvatarUrl(pData.avatar_url || '');
      setImgError(false);
      if (pData.avatar_url) {
        const urlParts = pData.avatar_url.split('/');
        setOldAvatarPath(urlParts[urlParts.length - 1]);
      }

      const normalizedValues = {
        fullName: pData.full_name || '', shopName: sData.shop_name || sellerDataResult?.shop_name || '', city: sData.business_address || pData.city || '',
        phone: pData.phone || '', experience: pData.experience ? Number(pData.experience) : null, bio: sData.professional_bio || pData.bio || '',
        emergencyContact: sData.emergency_contact || '', languages: sData.languages || '', specialities: sData.specialities || '',
        certifications: sData.certifications || '', awards: sData.awards || '', website: sData.website || '', instagram: sData.instagram || '',
        youtube: sData.youtube || '', whatsapp: sData.whatsapp || '', googleMapsUrl: sData.google_maps_url || '',
        isBridalSpecialist: sData.is_bridal_specialist || false, isHomeService: sData.is_home_service || false,
        travelRadius: sData.travel_radius ?? null, travelCharges: sData.travel_charges ?? null, startingPrice: sData.starting_price ?? null,
        gstNumber: sData.gst_number || sellerDataResult?.gst_number || '', panNumber: sData.pan_number || sellerDataResult?.pan_number || '',
        aadhaarVerification: sData.aadhaar_verification || '', bankAccount: sellerDataResult?.bank_account_number || sData.bank_account || '',
        ifscCode: sellerDataResult?.bank_ifsc_code || sData.ifsc_code || '', upiId: sellerDataResult?.upi_id || sData.upi_id || '',
        travelPolicy: sData.travel_policy || '', cancellationPolicy: sData.cancellation_policy || '', serviceAreas: sData.service_areas || '',
        lunchBreakStart: sData.lunch_break_start || '', lunchBreakEnd: sData.lunch_break_end || '', isVacation: sData.is_vacation || false
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
        if (isRecoverableSchemaError(portfolioRes.value.error)) missingTables.push('artist_portfolio'); else throw portfolioRes.value.error;
      } else if (portfolioRes.status === 'fulfilled') setPortfolioItems(portfolioRes.value.data || []);

      if (servicesRes.status === 'fulfilled' && servicesRes.value.error) {
        if (isRecoverableSchemaError(servicesRes.value.error)) missingTables.push('artist_services'); else throw servicesRes.value.error;
      } else if (servicesRes.status === 'fulfilled') setServices(servicesRes.value.data || []);

      if (availabilityRes.status === 'fulfilled' && availabilityRes.value.error) {
        if (isRecoverableSchemaError(availabilityRes.value.error)) missingTables.push('artist_availability'); else throw availabilityRes.value.error;
      } else if (availabilityRes.status === 'fulfilled') setAvailabilityRows((availabilityRes.value.data || []) as any[]);

      if (verificationRes.status === 'fulfilled' && verificationRes.value.error) {
        if (isRecoverableSchemaError(verificationRes.value.error)) missingTables.push('artist_verification'); else throw verificationRes.value.error;
      } else if (verificationRes.status === 'fulfilled') {
        setVerification(verificationRes.value.data as any);
        setVerificationStatus((verificationRes.value.data as any)?.status || 'pending');
      }

      const { data: reviewsData } = await supabase.from('artist_reviews').select('*').eq('artist_id', artistId).order('created_at', { ascending: false });
      if (reviewsData) setReviews(reviewsData);

      if (missingTables.length) throw new Error(`Professional profile schema is incomplete. Missing table(s): ${missingTables.join(', ')}.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') { setLoadError(err?.message || 'Failed to load profile data'); toast.error(err?.message); }
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
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); supabase.removeChannel(channel); };
  }, [artistId, loadData]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // IMAGE HANDLING
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_WIDTH = 800;
          if (img.width <= MAX_WIDTH) { resolve(file); return; }
          const scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement('canvas'); canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
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

      if (oldAvatarPath) supabase.storage.from('profile-images').remove([`avatars/${oldAvatarPath}`]).catch(e => console.error(e));
      setAvatarUrl(publicUrl); setImgError(false); setOldAvatarPath(fileName);
      toast.success('Avatar updated');
    } catch (err) { toast.error('Avatar upload failed'); } finally { setUploadingAvatar(false); }
  };

  const persistShopProfile = async (shopPayload: any) => {
    const { data: existingShop, error: selectError } = await supabase.from('shops').select('id').eq('user_id', artistId).maybeSingle();
    if (selectError && !isRecoverableSchemaError(selectError)) throw selectError;
    if (existingShop?.id) await supabase.from('shops').update(shopPayload).eq('id', existingShop.id);
    else await supabase.from('shops').insert(shopPayload);
  };

  const persistSellerProfile = async (sellerPayload: any) => {
    const { data: existingSeller, error: selectError } = await supabase.from('sellers').select('id').eq('user_id', artistId).maybeSingle();
    if (selectError && !isRecoverableSchemaError(selectError)) throw selectError;
    if (existingSeller?.id) await supabase.from('sellers').update(sellerPayload).eq('id', existingSeller.id);
    else await supabase.from('sellers').insert(sellerPayload);
  };

  const saveProfileSection = async (data: ProfileFormValues) => {
    setSaveError(null);
    data.bio = data.bio.trim();
    const instaMatch = data.instagram?.match(/instagram\.com\/([^/?]+)/);
    const normalizedInsta = instaMatch ? instaMatch[1] : data.instagram?.replace('@', '');

    const profilePayload = { full_name: data.fullName, phone: data.phone, city: data.city, bio: data.bio, experience: data.experience, display_name: data.shopName, updated_at: new Date().toISOString() };
    const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', artistId);
    if (profileError) throw profileError;

    const shopPayload = {
      user_id: artistId, shop_name: data.shopName, business_address: data.city, professional_bio: data.bio, emergency_contact: data.emergencyContact || null,
      languages: data.languages || null, specialities: data.specialities || null, certifications: data.certifications || null, awards: data.awards || null,
      website: data.website || null, instagram: normalizedInsta || null, youtube: data.youtube || null, whatsapp: data.whatsapp || null, google_maps_url: data.googleMapsUrl || null,
      is_bridal_specialist: data.isBridalSpecialist, is_home_service: data.isHomeService, travel_radius: data.travelRadius ?? null, travel_charges: data.travelCharges ?? null,
      starting_price: data.startingPrice ?? null, travel_policy: data.travelPolicy || null, cancellation_policy: data.cancellationPolicy || null, service_areas: data.serviceAreas || null,
      lunch_break_start: data.lunchBreakStart || null, lunch_break_end: data.lunchBreakEnd || null, is_vacation: data.isVacation,
      gst_number: data.gstNumber || null, pan_number: data.panNumber || null, aadhaar_verification: data.aadhaarVerification || null,
      bank_account: data.bankAccount || null, ifsc_code: data.ifscCode || null, upi_id: data.upiId || null,
    };
    await persistShopProfile(shopPayload);

    const sellerPayload = {
      user_id: artistId, shop_type: 'makeup', shop_description: data.bio, gst_number: data.gstNumber || null, pan_number: data.panNumber || null,
      bank_account_number: data.bankAccount || null, bank_ifsc_code: data.ifscCode || null, upi_id: data.upiId || null,
      kyc_status: verificationStatus || 'pending', is_verified: verificationStatus === 'verified',
    };
    await persistSellerProfile(sellerPayload);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try { await saveProfileSection(data); setSaveSuccess(true); window.setTimeout(() => setSaveSuccess(false), 1800); toast.success('Profile saved successfully'); } 
    catch (err: any) { setSaveError(err.message); toast.error('Save failed'); }
  };

  const onSubmitVerificationTab = async (data: ProfileFormValues) => {
    try { await saveProfileSection(data); await handleVerificationSave(); setSaveSuccess(true); window.setTimeout(() => setSaveSuccess(false), 1800); toast.success('Verification details saved'); } 
    catch (err: any) { setSaveError(err.message); toast.error('Save failed'); }
  };

  // PORTFOLIO LOGIC
  const handlePortfolioSubmit = async () => {
    try {
      setPortfolioUploading(true);
      const isBeforeAfter = portfolioForm.category === 'before_after';
      if (isBeforeAfter && (!beforeFile || !afterFile)) return toast.error("Please select both Before and After images.");
      if (!isBeforeAfter && !portfolioFile) return toast.error("Please select an image.");

      let imageUrl = null, beforeUrl = null, afterUrl = null;
      const uploadFile = async (file: File, prefix: string) => {
        const filePath = `portfolio/${artistId}-${prefix}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('portfolio-images').upload(filePath, file, { upsert: true });
        if (error) throw error;
        return supabase.storage.from('portfolio-images').getPublicUrl(filePath).data.publicUrl;
      };

      if (isBeforeAfter) { beforeUrl = await uploadFile(beforeFile!, 'before'); afterUrl = await uploadFile(afterFile!, 'after'); } 
      else { imageUrl = await uploadFile(portfolioFile!, 'single'); }

      const insertPayload = {
        artist_id: artistId, title: portfolioForm.title || 'Work Sample', description: portfolioForm.description || '', category: portfolioForm.category,
        is_featured: portfolioForm.isFeatured, service_id: portfolioForm.service_id || null, image_url: imageUrl, before_image_url: beforeUrl, after_image_url: afterUrl,
        display_order: (portfolioItems[0]?.display_order || 0) + 1,
      };

      const { data, error } = await supabase.from('artist_portfolio').insert(insertPayload).select().single();
      if (error) throw error;
      setPortfolioItems(prev => [data, ...prev]);
      setPortfolioForm({ title: '', description: '', category: 'bridal', isFeatured: false, service_id: '' });
      setPortfolioFile(null); setBeforeFile(null); setAfterFile(null);
      toast.success('Portfolio item added successfully!');
    } catch (err: any) { toast.error('Upload failed'); } finally { setPortfolioUploading(false); }
  };

  const handlePortfolioDelete = async (id: string) => {
    try { await supabase.from('artist_portfolio').delete().eq('id', id).eq('artist_id', artistId); setPortfolioItems(prev => prev.filter(item => item.id !== id)); toast.success('Portfolio item removed'); } 
    catch (err: any) { toast.error('Failed to remove'); }
  };

  const handlePortfolioFeature = async (item: any) => {
    try {
      await supabase.from('artist_portfolio').update({ is_featured: false }).eq('artist_id', artistId);
      await supabase.from('artist_portfolio').update({ is_featured: true }).eq('id', item.id);
      setPortfolioItems(prev => prev.map(entry => ({ ...entry, is_featured: entry.id === item.id })));
      toast.success('Cover image updated');
    } catch (err: any) { toast.error('Update failed'); }
  };

  // SERVICES LOGIC
  const handleServiceEdit = (service: any) => {
    setServiceForm({
      title: service.title, description: service.description || '', price: service.price?.toString() || '', priceType: service.price_type || 'fixed',
      advanceAmount: service.advance_amount?.toString() || '', duration: service.duration_minutes?.toString() || '60', category: service.category || 'bridal',
      whatsIncluded: service.whats_included || '', addons: service.addons || '', isHomeService: service.is_home_service ?? true, isActive: service.is_active ?? true
    });
    setEditingServiceId(service.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServiceDuplicate = (service: any) => {
    setServiceForm({
      title: `${service.title} (Copy)`, description: service.description || '', price: service.price?.toString() || '', priceType: service.price_type || 'fixed',
      advanceAmount: service.advance_amount?.toString() || '', duration: service.duration_minutes?.toString() || '60', category: service.category || 'bridal',
      whatsIncluded: service.whats_included || '', addons: service.addons || '', isHomeService: service.is_home_service ?? true, isActive: false 
    });
    setEditingServiceId(null);
    setShowAdvancedServiceOptions(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Service duplicated. Edit details and save.');
  };

  const handleCancelServiceEdit = () => {
    setServiceForm({ title: '', description: '', price: '', priceType: 'fixed', advanceAmount: '', duration: '60', category: 'bridal', whatsIncluded: '', addons: '', isHomeService: true, isActive: true });
    setEditingServiceId(null); setShowAdvancedServiceOptions(false);
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try { await supabase.from('artist_services').update({ is_active: !currentStatus }).eq('id', serviceId); setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_active: !currentStatus } : s)); toast.success(currentStatus ? 'Service hidden' : 'Service is live!'); } 
    catch (err: any) { toast.error('Failed to update'); }
  };

  const handleServiceSave = async () => {
    if (!serviceForm.title || !serviceForm.price) return toast.error('Title and Price are required');
    try {
      setServicesLoading(true);
      const payload = {
        artist_id: artistId, title: serviceForm.title, description: serviceForm.description, price: Number(serviceForm.price), price_type: serviceForm.priceType,
        advance_amount: serviceForm.advanceAmount ? Number(serviceForm.advanceAmount) : null, duration_minutes: Number(serviceForm.duration) || 60, category: serviceForm.category,
        whats_included: serviceForm.whatsIncluded, addons: serviceForm.addons, is_home_service: serviceForm.isHomeService, is_active: serviceForm.isActive,
      };

      if (editingServiceId) {
        const { data } = await supabase.from('artist_services').update(payload).eq('id', editingServiceId).select().single();
        setServices(prev => prev.map(s => s.id === editingServiceId ? data : s)); toast.success('Service updated!');
      } else {
        const { data } = await supabase.from('artist_services').insert(payload).select().single();
        setServices(prev => [data, ...prev]); toast.success('New service published!');
      }
      handleCancelServiceEdit();
    } catch (err: any) { toast.error('Failed to save'); } finally { setServicesLoading(false); }
  };

  const handleServiceDelete = async (serviceId: string) => {
    if (!window.confirm("Archive this service?")) return;
    try { await supabase.from('artist_services').update({ is_active: false }).eq('id', serviceId).eq('artist_id', artistId); setServices(prev => prev.filter(item => item.id !== serviceId)); toast.success('Service archived'); } 
    catch (err: any) { toast.error('Failed to remove'); }
  };

  // AVAILABILITY LOGIC
  const updateAvailabilityRow = (index: number, field: string, value: any) => { setAvailabilityRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row)); };
  const handleAvailabilitySave = async () => {
    try {
      setAvailabilityLoading(true);
      for (const row of availabilityRows) {
        const payload = { artist_id: artistId, day_of_week: row.day_of_week, start_time: row.start_time || '09:00', end_time: row.end_time || '18:00', is_working_day: row.is_working_day ?? true, slot_duration_minutes: Number(row.slot_duration_minutes || 60), max_bookings_per_day: Number(row.max_bookings_per_day || 1), };
        if (row.id) await supabase.from('artist_availability').update(payload).eq('id', row.id); else await supabase.from('artist_availability').insert(payload);
      }
      toast.success('Availability updated'); await loadData();
    } catch (err: any) { toast.error('Update failed'); } finally { setAvailabilityLoading(false); }
  };

  // VERIFICATION LOGIC
  const handleVerificationSave = async () => {
    try {
      setVerificationLoading(true);
      const payload = { artist_id: artistId, status: verificationStatus };
      if (verification?.id) await supabase.from('artist_verification').update(payload).eq('id', verification.id); else await supabase.from('artist_verification').insert(payload);
      setVerification(prev => prev ? { ...prev, status: verificationStatus } : { artist_id: artistId, status: verificationStatus });
      toast.success('Verification status updated');
    } catch (err: any) { toast.error('Save failed'); } finally { setVerificationLoading(false); }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-24 duration-500">
      
      {/* 🚀 MODERN HEADER & TABS CONTAINER */}
      <div className="mb-4 sm:mb-6 rounded-[24px] sm:rounded-[32px] bg-white p-3 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto scrollbar-hide pb-1">
            <TabsList className="flex inline-flex gap-2 p-1 bg-slate-50/80 rounded-2xl w-max">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'portfolio', label: 'Portfolio' },
                { id: 'services', label: 'Services' },
                { id: 'availability', label: 'Availability' },
                { id: 'presence', label: 'Presence' },
                { id: 'verification', label: 'Verification' }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id} value={tab.id} 
                  className="rounded-xl px-4 py-2.5 text-[11px] font-semibold tracking-wide text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-4 sm:mt-6">
            
            {/* ----------------- OVERVIEW TAB ----------------- */}
            <TabsContent value="overview" className="focus:outline-none">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Profile Overview</h3>
                      <p className="mt-1 text-xs text-slate-500 font-medium">Core business details and positioning.</p>
                    </div>
                    <button type="submit" disabled={isSubmitting || (!isDirty && !saveSuccess)} className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 shadow-pink-500/20 hover:scale-[1.02]'}`}>
                      {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Details'}
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center mb-6">
                    <div className="relative h-24 w-24">
                      <div className="h-full w-full rounded-full bg-gradient-to-tr from-pink-400 to-fuchsia-500 p-1">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
                          {avatarUrl && !imgError ? <img src={avatarUrl} alt="Avatar" onError={() => setImgError(true)} className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-slate-300" />}
                        </div>
                      </div>
                      <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:scale-110 transition-transform">
                        <Camera className="h-3.5 w-3.5 text-slate-600" />
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Profile Photo</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                      <Controller name="fullName" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Shop / Studio Name</label>
                      <Controller name="shopName" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">City</label>
                      <Controller name="city" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Primary Phone</label>
                      <Controller name="phone" control={control} render={({ field }) => <input {...field} type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Emergency Contact</label>
                      <Controller name="emergencyContact" control={control} render={({ field }) => <input {...field} type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Experience (Yrs)</label>
                      <Controller name="experience" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Professional Bio <span className="lowercase font-normal float-right">{bioContent.length}/500</span></label>
                    <Controller name="bio" control={control} render={({ field }) => <textarea {...field} rows={3} maxLength={500} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all resize-none" />} />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Languages Known</label>
                      <Controller name="languages" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Specialities</label>
                      <Controller name="specialities" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Starting Price (₹)</label>
                      <Controller name="startingPrice" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Travel Radius (KM)</label>
                      <Controller name="travelRadius" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Charge / KM (₹)</label>
                      <Controller name="travelCharges" control={control} render={({ field: { onChange, ...rest } }) => <input type="number" onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                      <Controller name="isBridalSpecialist" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-4 h-4 accent-fuchsia-500 rounded" />} />
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-fuchsia-500" /> Bridal Specialist</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                      <Controller name="isHomeService" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-4 h-4 accent-fuchsia-500 rounded" />} />
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-fuchsia-500" /> Home Services</span>
                    </label>
                  </div>
                </div>

                {/* Booking Policies within Overview */}
                <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Booking Policies</h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">Terms shown to clients before booking.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Lunch Break Start</label>
                      <Controller name="lunchBreakStart" control={control} render={({ field }) => <input {...field} type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Lunch Break End</label>
                      <Controller name="lunchBreakEnd" control={control} render={({ field }) => <input {...field} type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Travel Policy</label>
                    <Controller name="travelPolicy" control={control} render={({ field }) => <textarea {...field} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all resize-none" />} />
                  </div>
                  <div className="mt-4">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Cancellation Policy</label>
                    <Controller name="cancellationPolicy" control={control} render={({ field }) => <textarea {...field} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all resize-none" />} />
                  </div>
                  <div className="mt-4 pt-2">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border transition-colors ${isVacationActive ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <Controller name="isVacation" control={control} render={({ field: { value, onChange } }) => <input type="checkbox" checked={value} onChange={onChange} className="w-4 h-4 accent-amber-500 rounded" />} />
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Plane className="w-4 h-4 text-amber-500" /> On Vacation (Pause all new bookings)</span>
                    </label>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* ----------------- PORTFOLIO TAB ----------------- */}
            <TabsContent value="portfolio" className="focus:outline-none">
              <div className="space-y-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Portfolio Gallery</h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">Showcase your transformations.</p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add New Work</span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-fuchsia-600">
                      <input type="checkbox" checked={portfolioForm.category === 'before_after'} onChange={(e) => { setPortfolioForm(prev => ({ ...prev, category: e.target.checked ? 'before_after' : 'bridal' })); setPortfolioFile(null); setBeforeFile(null); setAfterFile(null); }} className="w-4 h-4 accent-fuchsia-500 rounded" />
                      Before / After Mode
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 mb-3">
                    <input value={portfolioForm.title} onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Title (e.g. HD Bridal Look)" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-fuchsia-300" />
                    <input value={portfolioForm.description} onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Caption" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-fuchsia-300" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 mb-4">
                    <select value={portfolioForm.category} onChange={(e) => setPortfolioForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none">
                      <option value="bridal">Bridal</option>
                      <option value="party">Party</option>
                      <option value="before_after">Before & After</option>
                    </select>
                    <label className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                      <input type="checkbox" checked={portfolioForm.isFeatured} onChange={(e) => setPortfolioForm(prev => ({ ...prev, isFeatured: e.target.checked }))} className="w-4 h-4 accent-fuchsia-500 rounded" />
                      Set as Cover
                    </label>
                  </div>

                  {portfolioForm.category === 'before_after' ? (
                    <div className="grid gap-3 md:grid-cols-2 mb-4">
                      <label className="flex flex-col items-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Before Image</span>
                        {beforeFile ? <span className="text-xs font-semibold text-slate-800">{beforeFile.name}</span> : <Camera className="w-6 h-6 text-slate-300 mt-2" />}
                        <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                      <label className="flex flex-col items-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">After Image</span>
                        {afterFile ? <span className="text-xs font-semibold text-slate-800">{afterFile.name}</span> : <Sparkles className="w-6 h-6 text-slate-300 mt-2" />}
                        <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="flex flex-col items-center p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white cursor-pointer hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Work Image</span>
                        {portfolioFile ? <span className="text-xs font-semibold text-slate-800">{portfolioFile.name}</span> : <ImageIcon className="w-8 h-8 text-slate-300 mt-2" />}
                        <input type="file" accept="image/*" onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                    </div>
                  )}

                  <button type="button" onClick={handlePortfolioSubmit} disabled={portfolioUploading} className="w-full md:w-auto md:ml-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50">
                    {portfolioUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Upload Image
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-8">
                  {['all', 'bridal', 'party', 'before_after'].map((cat) => (
                    <button key={cat} onClick={() => setPortfolioFilter(cat)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${portfolioFilter === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat.replace('_', ' ')}</button>
                  ))}
                </div>

                {portfolioItems.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-[24px] border border-slate-100">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">No images uploaded</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolioItems.filter(item => portfolioFilter === 'all' || item.category === portfolioFilter).map(item => (
                      <div key={item.id} className="group overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                        <div className="relative h-48 bg-slate-100">
                          {item.category === 'before_after' ? (
                            <div className="flex h-full w-full">
                              <div className="w-1/2 h-full relative border-r border-white"><img src={item.before_image_url} className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded">BEFORE</span></div>
                              <div className="w-1/2 h-full relative"><img src={item.after_image_url} className="h-full w-full object-cover" /><span className="absolute bottom-2 right-2 bg-fuchsia-500/90 text-white text-[8px] px-1.5 py-0.5 rounded">AFTER</span></div>
                            </div>
                          ) : (
                            <img src={item.image_url || item.after_image_url} className="h-full w-full object-cover" />
                          )}
                          {item.is_featured && <span className="absolute top-3 left-3 bg-white/90 text-slate-900 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm">⭐ Cover</span>}
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                            <button onClick={() => handlePortfolioFeature(item)} className="text-[10px] font-bold text-fuchsia-600 uppercase">Make Cover</button>
                            <button onClick={() => handlePortfolioDelete(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ----------------- SERVICES TAB ----------------- */}
            <TabsContent value="services" className="focus:outline-none">
              <div className="space-y-6 sm:space-y-8 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-fuchsia-500" /> Service Catalog
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">Manage the packages and rates shown on your profile.</p>
                  </div>
                </div>

                <div className={`relative overflow-hidden rounded-[24px] transition-all duration-300 ${editingServiceId ? 'bg-fuchsia-50/30 border border-fuchsia-200 shadow-[0_8px_30px_rgba(217,70,239,0.08)]' : 'bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
                  <div className={`px-5 py-4 border-b flex justify-between items-center ${editingServiceId ? 'border-fuchsia-100' : 'border-slate-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${editingServiceId ? 'text-fuchsia-600' : 'text-slate-800'}`}>
                      {editingServiceId ? 'Edit Service' : 'Add New Service'}
                    </h4>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Visible</span>
                      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${serviceForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${serviceForm.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="p-5 grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Service Title</label>
                      <input value={serviceForm.title} onChange={(e) => setServiceForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Bridal HD Makeup" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all placeholder:text-slate-400" />
                    </div>
                    
                    <div className="md:col-span-4 flex gap-3">
                      <div className="w-1/2">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Pricing</label>
                        <select value={serviceForm.priceType} onChange={(e) => setServiceForm(prev => ({ ...prev, priceType: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-medium text-slate-700 focus:bg-white focus:border-fuchsia-300 outline-none transition-all appearance-none">
                          <option value="fixed">Fixed</option>
                          <option value="starting">Starts At</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div className="w-1/2 relative">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Amount</label>
                        <span className="absolute left-3 top-[30px] text-slate-400 font-medium">₹</span>
                        <input value={serviceForm.price} onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))} type="number" placeholder="25000" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-7 pr-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all placeholder:text-slate-400" />
                      </div>
                    </div>

                    <div className="md:col-span-12 pt-2">
                      <button type="button" onClick={() => setShowAdvancedServiceOptions(!showAdvancedServiceOptions)} className="flex items-center gap-1.5 text-[11px] font-bold text-fuchsia-600 hover:text-fuchsia-700 transition-colors bg-fuchsia-50/50 px-3 py-1.5 rounded-lg border border-fuchsia-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        {showAdvancedServiceOptions ? 'Hide Details' : 'Add Inclusions, Advance & Add-ons'}
                        {showAdvancedServiceOptions ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    </div>

                    {showAdvancedServiceOptions && (
                      <div className="md:col-span-12 grid gap-4 md:grid-cols-12 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">What's Included <span className="normal-case font-normal text-slate-400">(Comma separated)</span></label>
                          <textarea value={serviceForm.whatsIncluded} onChange={(e) => setServiceForm(prev => ({ ...prev, whatsIncluded: e.target.value }))} rows={2} placeholder="HD Makeup, Premium Hairstyling, Saree Draping..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:bg-white focus:border-fuchsia-300 outline-none transition-all resize-none placeholder:text-slate-400" />
                        </div>
                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Optional Add-ons <span className="normal-case font-normal text-slate-400">(e.g. Lashes +500)</span></label>
                          <textarea value={serviceForm.addons} onChange={(e) => setServiceForm(prev => ({ ...prev, addons: e.target.value }))} rows={2} placeholder="Premium Lashes +₹500, Extra Draping +₹300" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:bg-white focus:border-fuchsia-300 outline-none transition-all resize-none placeholder:text-slate-400" />
                        </div>
                        <div className="md:col-span-4 relative">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Advance Amount</label>
                          <span className="absolute left-3 top-[30px] text-slate-400 font-medium text-sm">₹</span>
                          <input value={serviceForm.advanceAmount} onChange={(e) => setServiceForm(prev => ({ ...prev, advanceAmount: e.target.value }))} type="number" placeholder="5000" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-7 pr-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all placeholder:text-slate-400" />
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Category</label>
                          <select value={serviceForm.category} onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-medium text-slate-700 focus:bg-white focus:border-fuchsia-300 outline-none transition-all appearance-none">
                            <option value="bridal">Bridal Package</option>
                            <option value="party">Party / Guest</option>
                            <option value="pre_wedding">Pre-Wedding</option>
                            <option value="trial">Makeup Trial</option>
                          </select>
                        </div>
                        <div className="md:col-span-4 relative">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Duration</label>
                          <input value={serviceForm.duration} onChange={(e) => setServiceForm(prev => ({ ...prev, duration: e.target.value }))} type="number" placeholder="120" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 pr-12 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all placeholder:text-slate-400" />
                          <span className="absolute right-4 top-[32px] text-[10px] font-bold text-slate-400">MIN</span>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-12 flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                      {editingServiceId && (
                        <button type="button" onClick={handleCancelServiceEdit} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                          Cancel
                        </button>
                      )}
                      <button type="button" onClick={() => void handleServiceSave()} disabled={servicesLoading} className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${editingServiceId ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:shadow-pink-500/25 hover:scale-[1.02]'}`}>
                        {servicesLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (editingServiceId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />)} 
                        {editingServiceId ? 'Save Changes' : 'Publish Service'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <div className="flex items-center justify-between mb-5 px-1">
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">Active Catalog</h4>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">{services.length} items</span>
                  </div>
                  
                  {services.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4"><Sparkles className="w-6 h-6 text-slate-300" /></div>
                      <p className="text-sm font-semibold text-slate-700">No services added yet</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[250px] text-center leading-relaxed">Add your first package above to allow clients to discover and book you.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                      {services.map(service => (
                        <div key={service.id} className={`group flex flex-col rounded-[24px] bg-white border shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 overflow-hidden ${!service.is_active ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:border-pink-200'} ${editingServiceId === service.id ? 'ring-2 ring-fuchsia-400 ring-offset-2' : ''}`}>
                          <div className="p-5 sm:p-6 flex-1 relative">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                {service.category?.replace('_', ' ')}
                              </span>
                              <button onClick={() => toggleServiceStatus(service.id, service.is_active)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${service.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                {service.is_active ? 'Live' : 'Hidden'}
                              </button>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-2 pr-4">{service.title}</h4>
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-4">
                              <Clock className="w-3.5 h-3.5" /> {service.duration_minutes || 60} minutes
                            </p>

                            <div className="flex items-baseline gap-1.5 mb-5">
                              {service.price_type === 'starting' && <span className="text-xs font-semibold text-slate-400 mb-1">From</span>}
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">₹{service.price}</h3>
                              {service.price_type === 'custom' && <span className="text-xs font-semibold text-slate-400 mb-1">(Custom)</span>}
                            </div>

                            {service.whats_included && (
                              <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Package Includes</p>
                                <div className="flex flex-col gap-1.5">
                                  {service.whats_included.split(',').slice(0, 3).map((item: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <div className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-emerald-600" /></div>
                                      <span className="text-xs font-medium text-slate-700 leading-tight">{item.trim()}</span>
                                    </div>
                                  ))}
                                  {service.whats_included.split(',').length > 3 && (
                                    <span className="text-[10px] font-semibold text-slate-400 ml-5">+ {service.whats_included.split(',').length - 3} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {service.advance_amount && (
                              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-amber-100/50">
                                <DollarSign className="w-3.5 h-3.5" /> Advance: ₹{service.advance_amount}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/50 divide-x divide-slate-100">
                            <button type="button" onClick={() => handleServiceEdit(service)} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-colors">
                              <PencilLine className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button type="button" onClick={() => handleServiceDuplicate(service)} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-colors">
                              <Copy className="w-3.5 h-3.5" /> Clone
                            </button>
                            <button type="button" onClick={() => handleServiceDelete(service.id)} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ----------------- AVAILABILITY TAB ----------------- */}
            <TabsContent value="availability" className="focus:outline-none">
              <div className="space-y-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Weekly Availability</h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Set your working hours and booking capacity.</p>
                </div>
                
                <div className="space-y-4">
                  {availabilityRows.map((row, index) => (
                    <div key={row.day_of_week ?? index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{DAY_LABELS[index]?.label || row.day_label || `Day ${row.day_of_week}`}</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Working Day</span>
                          <input type="checkbox" checked={row.is_working_day ?? true} onChange={(e) => updateAvailabilityRow(index, 'is_working_day', e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded" />
                        </label>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Start Time</label>
                          <input type="time" value={row.start_time || '09:00'} onChange={(e) => updateAvailabilityRow(index, 'start_time', e.target.value)} disabled={!row.is_working_day} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-fuchsia-300 disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">End Time</label>
                          <input type="time" value={row.end_time || '18:00'} onChange={(e) => updateAvailabilityRow(index, 'end_time', e.target.value)} disabled={!row.is_working_day} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-fuchsia-300 disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Slot Duration</label>
                          <input type="number" value={row.slot_duration_minutes || 60} onChange={(e) => updateAvailabilityRow(index, 'slot_duration_minutes', e.target.value)} disabled={!row.is_working_day} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-fuchsia-300 disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Max Bookings</label>
                          <input type="number" value={row.max_bookings_per_day || 1} onChange={(e) => updateAvailabilityRow(index, 'max_bookings_per_day', e.target.value)} disabled={!row.is_working_day} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-fuchsia-300 disabled:opacity-50" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => void handleAvailabilitySave()} disabled={availabilityLoading} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50">
                    {availabilityLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Schedule
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* ----------------- PRESENCE TAB ----------------- */}
            <TabsContent value="presence" className="focus:outline-none">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Online Presence</h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">Links and maps so clients can find you.</p>
                  </div>
                  <button type="submit" disabled={isSubmitting || (!isDirty && !saveSuccess)} className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 shadow-pink-500/20 hover:scale-[1.02]'}`}>
                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Presence'}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5 text-fuchsia-500" /> Instagram Username</label>
                    <Controller name="instagram" control={control} render={({ field }) => <input {...field} placeholder="@yourstudio" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5 text-fuchsia-500" /> YouTube Link</label>
                    <Controller name="youtube" control={control} render={({ field }) => <input {...field} placeholder="Channel URL" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-fuchsia-500" /> Website</label>
                    <Controller name="website" control={control} render={({ field }) => <input {...field} type="url" placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-fuchsia-500" /> Google Maps URL</label>
                    <Controller name="googleMapsUrl" control={control} render={({ field }) => <input {...field} type="url" placeholder="Maps link" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-fuchsia-500" /> WhatsApp Number</label>
                    <Controller name="whatsapp" control={control} render={({ field }) => <input {...field} type="tel" placeholder="10-digit number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">Service Areas</label>
                    <Controller name="serviceAreas" control={control} render={({ field }) => <input {...field} placeholder="Anna Nagar, T Nagar..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-fuchsia-300 outline-none transition-all" />} />
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* ----------------- VERIFICATION TAB ----------------- */}
            <TabsContent value="verification" className="focus:outline-none">
              <form onSubmit={handleSubmit(onSubmitVerificationTab)} className="space-y-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Verification & Payouts</h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">Keep KYC and bank details current for smooth payouts.</p>
                  </div>
                  <button type="submit" disabled={isSubmitting || verificationLoading} className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-900 shadow-slate-900/20 hover:scale-[1.02]'}`}>
                    {isSubmitting || verificationLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {isSubmitting || verificationLoading ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save KYC Details'}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">GST Number</label>
                    <Controller name="gstNumber" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 uppercase focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">PAN Number</label>
                    <Controller name="panNumber" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 uppercase focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Aadhaar / ID</label>
                    <Controller name="aadhaarVerification" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Bank A/C Number</label>
                    <Controller name="bankAccount" control={control} render={({ field }) => <input {...field} type="password" placeholder="••••••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">IFSC Code</label>
                    <Controller name="ifscCode" control={control} render={({ field }) => <input {...field} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 uppercase focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">UPI ID</label>
                    <Controller name="upiId" control={control} render={({ field }) => <input {...field} placeholder="name@bank" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-all" />} />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Internal Verification Status</label>
                  <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as 'pending' | 'verified' | 'rejected')} className="w-full max-w-xs bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none">
                    <option value="pending">Pending Review</option>
                    <option value="verified">Verified ✅</option>
                    <option value="rejected">Rejected ❌</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">Only admins change this status after document review.</p>
                </div>
              </form>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 z-[101] rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition" onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}>
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-5xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {selectedImage.category === 'before_after' && selectedImage.before_image_url && selectedImage.after_image_url ? (
              <div className="flex h-full w-full gap-1 sm:gap-2">
                <div className="relative w-1/2 h-full"><img src={selectedImage.before_image_url} alt="Before" className="h-full w-full object-contain rounded-xl sm:rounded-2xl bg-black/50" /><span className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest shadow-lg">Before</span></div>
                <div className="relative w-1/2 h-full"><img src={selectedImage.after_image_url} alt="After" className="h-full w-full object-contain rounded-xl sm:rounded-2xl bg-black/50" /><span className="absolute bottom-4 right-4 bg-fuchsia-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest shadow-lg">After</span></div>
              </div>
            ) : (
              <img src={selectedImage.image_url || selectedImage.after_image_url} alt={selectedImage.title} className="max-h-full max-w-full object-contain rounded-2xl mx-auto bg-black/50" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfessionalProfile(props: ProfessionalProfileProps) {
  return (
    <ProfileErrorBoundary>
      <ProfessionalProfileContent {...props} />
    </ProfileErrorBoundary>
  );
}
