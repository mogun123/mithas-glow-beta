// ServicesTab.tsx
// MITHAS GLOW — Futuristic AI Beauty Service Studio
// UI redesign only. Existing Supabase/business handlers remain untouched.

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Globe,
  DollarSign,
  RefreshCw,
  Save,
  Plus,
  PencilLine,
  Trash2,
  Crown,
  Search,
  X,
  Zap,
  Clock3,
  Check,
  WandSparkles,
  Home,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SERVICE_CATALOG,
  searchServiceCatalog,
  ServiceCatalogEntry,
} from './serviceCatalog';

interface ServiceFormState {
  title: string;
  description: string;
  price: string;
  priceType: string;
  advanceAmount: string;
  duration: string;
  category: string;
  whatsIncluded: string;
  addons: string;
  isHomeService: boolean;
  isActive: boolean;
}

interface ServicesTabProps {
  services: any[];
  servicesLoading: boolean;
  editingServiceId: string | null;
  showAdvancedServiceOptions: boolean;
  setShowAdvancedServiceOptions: (v: boolean) => void;
  serviceForm: ServiceFormState;
  setServiceForm: React.Dispatch<React.SetStateAction<ServiceFormState>>;
  onSave: () => void | Promise<void>;
  onEdit: (service: any) => void;
  onDuplicate: (service: any) => void;
  onDelete: (serviceId: string) => void | Promise<void>;
  onCancelEdit: () => void;
  onToggleStatus: (
    serviceId: string,
    currentStatus: boolean
  ) => void | Promise<void>;
}

const DURATION_PRESETS = [30, 45, 60, 90, 120, 180];

function formatDuration(mins: number): string {
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;

  if (hours === 0) return `${mins}m`;
  if (remainder === 0) return `${hours}h`;

  return `${hours}h ${remainder}m`;
}

export default function ServicesTab({
  services,
  servicesLoading,
  editingServiceId,
  showAdvancedServiceOptions,
  setShowAdvancedServiceOptions,
  serviceForm,
  setServiceForm,
  onSave,
  onEdit,
  onDuplicate,
  onDelete,
  onCancelEdit,
  onToggleStatus,
}: ServicesTabProps) {
  const [catalogQuery, setCatalogQuery] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>('all');

  const catalogResults = useMemo(
    () =>
      catalogQuery
        ? searchServiceCatalog(catalogQuery, 10)
        : [],
    [catalogQuery]
  );

  const liveCount = services.filter((s) => s.is_active).length;

  const avgPrice = services.length
    ? Math.round(
        services.reduce(
          (sum, s) => sum + (Number(s.price) || 0),
          0
        ) / services.length
      )
    : 0;

  const filteredServices =
    activeCategoryFilter === 'all'
      ? services
      : services.filter(
          (s) => s.category === activeCategoryFilter
        );

  const pickCatalogEntry = (
    entry: ServiceCatalogEntry
  ) => {
    setServiceForm((prev) => ({
      ...prev,
      title: entry.name,
      category: entry.categoryId,
    }));

    setCatalogQuery('');
    setShowCatalog(false);
  };

  const handleSaveClick = () => {
    if (!serviceForm.title.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (
      serviceForm.priceType !== 'custom' &&
      !serviceForm.price
    ) {
      toast.error('Service price is required');
      return;
    }

    void onSave();
  };

  return (
    <div className="relative min-h-full overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#fff7fc] via-white to-[#f7f5ff] p-3 sm:p-5">

      {/* Ambient futuristic glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-pink-300/10 blur-3xl" />

      <div className="relative space-y-6">

        {/* ========================================================= */}
        {/* HERO HEADER */}
        {/* ========================================================= */}

        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-[0_20px_60px_rgba(190,24,93,0.08)] backdrop-blur-2xl sm:p-6">

          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-gradient-to-br from-fuchsia-300/20 to-violet-300/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-200/70 bg-fuchsia-50/80 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
                </span>

                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-600">
                  AI Beauty Studio
                </span>
              </div>

              <h3 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                <span className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-violet-600 bg-clip-text text-transparent">
                  Service Studio
                </span>

                <Sparkles className="h-5 w-5 text-fuchsia-500" />
              </h3>

              <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                Build your premium service menu and let clients
                discover, compare and book your beauty experiences.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  'Customer preview will open here.'
                )
              }
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200/80 bg-white/80 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-violet-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-lg hover:shadow-violet-500/10 active:scale-95"
            >
              <Globe className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Preview Storefront
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIVE ANALYTICS */}
        {/* ========================================================= */}

        <div className="grid grid-cols-3 gap-2 sm:gap-4">

          {/* Total */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-pink-200/50 bg-white/75 p-4 shadow-[0_12px_35px_rgba(236,72,153,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-500/10">

            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-pink-400/10 blur-xl transition-transform group-hover:scale-150" />

            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Services
                </span>

                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              </div>

              <p className="text-2xl font-black text-slate-900">
                {services.length}
              </p>

              <p className="mt-1 text-[9px] font-bold text-slate-400">
                Total catalog
              </p>
            </div>
          </div>

          {/* Live */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-emerald-200/50 bg-white/75 p-4 shadow-[0_12px_35px_rgba(16,185,129,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10">

            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-xl transition-transform group-hover:scale-150" />

            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Live
                </span>

                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>

              <p className="text-2xl font-black text-slate-900">
                {liveCount}
              </p>

              <p className="mt-1 text-[9px] font-bold text-slate-400">
                Visible to clients
              </p>
            </div>
          </div>

          {/* Average */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-violet-200/50 bg-white/75 p-4 shadow-[0_12px_35px_rgba(139,92,246,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">

            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-400/10 blur-xl transition-transform group-hover:scale-150" />

            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Avg price
                </span>

                <DollarSign className="h-3.5 w-3.5 text-violet-400" />
              </div>

              <p className="text-2xl font-black text-slate-900">
                ₹{avgPrice}
              </p>

              <p className="mt-1 text-[9px] font-bold text-slate-400">
                Across your menu
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CREATE SERVICE */}
        {/* ========================================================= */}

        <div
          className={`relative overflow-visible rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(190,24,93,0.07)] backdrop-blur-xl transition-all sm:p-6 ${
            editingServiceId
              ? 'border-violet-300/70 bg-violet-50/50'
              : 'border-pink-200/60 bg-white/70'
          }`}
        >

          {/* Header */}
          <div className="mb-5 flex items-center justify-between border-b border-pink-100/70 pb-4">

            <div>
              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20">
                  {editingServiceId ? (
                    <PencilLine className="h-4 w-4" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-800">
                    {editingServiceId
                      ? 'Edit experience'
                      : 'Create experience'}
                  </h4>

                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    Add a service to your public rate card
                  </p>
                </div>
              </div>
            </div>

            {/* Live toggle */}
            <label className="flex cursor-pointer items-center gap-2">

              <span className="hidden text-[9px] font-black uppercase tracking-widest text-slate-400 sm:block">
                {serviceForm.isActive
                  ? 'Live'
                  : 'Hidden'}
              </span>

              <div className="relative">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />

                <div className="h-7 w-12 rounded-full border border-slate-200 bg-slate-200 transition-all peer-checked:border-emerald-400 peer-checked:bg-emerald-500 peer-focus:ring-4 peer-focus:ring-emerald-500/10" />

                <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {/* ===================================================== */}
          {/* AI SEARCH */}
          {/* ===================================================== */}

          <div className="relative">

            <label className="mb-2 ml-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              <Sparkles className="h-3 w-3 text-fuchsia-500" />
              Service intelligence
            </label>

            <div className="group relative">

              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-pink-400/20 via-fuchsia-400/20 to-violet-400/20 opacity-0 blur transition-opacity group-focus-within:opacity-100" />

              <div className="relative flex items-center rounded-2xl border border-pink-200/70 bg-white/90 shadow-sm transition-all group-focus-within:border-fuchsia-300 group-focus-within:shadow-lg group-focus-within:shadow-fuchsia-500/10">

                <Search className="ml-4 h-4 w-4 flex-shrink-0 text-fuchsia-400" />

                <input
                  value={serviceForm.title}
                  onChange={(e) => {
                    setServiceForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }));

                    setCatalogQuery(e.target.value);
                    setShowCatalog(true);
                  }}
                  onFocus={() => setShowCatalog(true)}
                  placeholder="Search a service or type your own..."
                  className="w-full bg-transparent px-3 py-3.5 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                />

                {serviceForm.title && (
                  <button
                    type="button"
                    onClick={() => {
                      setServiceForm((prev) => ({
                        ...prev,
                        title: '',
                      }));

                      setCatalogQuery('');
                    }}
                    className="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Catalog */}
            {showCatalog &&
              catalogResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-pink-100 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl">

                  <div className="border-b border-slate-100 px-4 py-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                      Suggested services
                    </span>
                  </div>

                  {catalogResults.map((entry) => (
                    <button
                      key={`${entry.categoryId}-${entry.name}`}
                      type="button"
                      onClick={() =>
                        pickCatalogEntry(entry)
                      }
                      className="group flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left transition hover:bg-gradient-to-r hover:from-pink-50 hover:to-violet-50"
                    >
                      <span className="text-xs font-bold text-slate-700 group-hover:text-fuchsia-600">
                        {entry.name}
                      </span>

                      <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-fuchsia-500">
                        {entry.categoryId.replace(
                          '_',
                          ' '
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* ===================================================== */}
          {/* CATEGORY */}
          {/* ===================================================== */}

          <div className="mt-5">

            <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Experience category
            </label>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">

              {SERVICE_CATALOG.map((cat) => {
                const selected =
                  serviceForm.category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setServiceForm((prev) => ({
                        ...prev,
                        category: cat.id,
                      }))
                    }
                    className={`group flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[10px] font-black transition-all duration-300 ${
                      selected
                        ? 'border-fuchsia-400 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20'
                        : 'border-pink-100 bg-white/80 text-slate-500 hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-600'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}

                    {selected && (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================================================== */}
          {/* PRICE */}
          {/* ===================================================== */}

          <div className="mt-5 grid gap-3 sm:grid-cols-12">

            <div className="sm:col-span-5">
              <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Pricing model
              </label>

              <div className="relative">
                <select
                  value={serviceForm.priceType}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      priceType: e.target.value,
                    }))
                  }
                  className="w-full appearance-none rounded-2xl border border-pink-200/70 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10"
                >
                  <option value="fixed">
                    Fixed price
                  </option>
                  <option value="starting">
                    Starts at
                  </option>
                  <option value="custom">
                    Custom quote
                  </option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="sm:col-span-7">
              <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Price
              </label>

              <div className="flex items-center rounded-2xl border border-pink-200/70 bg-white transition focus-within:border-fuchsia-400 focus-within:ring-4 focus-within:ring-fuchsia-500/10">

                <span className="pl-4 text-sm font-black text-fuchsia-400">
                  ₹
                </span>

                <input
                  value={serviceForm.price}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  type="number"
                  inputMode="numeric"
                  placeholder="5000"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3.5 pr-4 text-sm font-black text-slate-800 outline-none placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* DURATION */}
          {/* ===================================================== */}

          <div className="mt-5">

            <label className="mb-2 ml-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              <Clock3 className="h-3 w-3 text-fuchsia-400" />
              Duration
            </label>

            <div className="flex flex-wrap gap-2">

              {DURATION_PRESETS.map((mins) => {
                const selected =
                  serviceForm.duration ===
                  String(mins);

                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      setServiceForm((prev) => ({
                        ...prev,
                        duration: String(mins),
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-[10px] font-black transition-all duration-300 ${
                      selected
                        ? 'border-fuchsia-400 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20'
                        : 'border-pink-100 bg-white text-slate-500 hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-600'
                    }`}
                  >
                    {selected && (
                      <Check className="mr-1 inline h-3 w-3" />
                    )}

                    {formatDuration(mins)}
                  </button>
                );
              })}

              <input
                value={serviceForm.duration}
                onChange={(e) =>
                  setServiceForm((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                type="number"
                inputMode="numeric"
                placeholder="Custom"
                className="w-28 rounded-full border border-pink-100 bg-white px-4 py-2 text-[10px] font-bold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10"
              />
            </div>
          </div>

          {/* ===================================================== */}
          {/* ADVANCED */}
          {/* ===================================================== */}

          <button
            type="button"
            onClick={() =>
              setShowAdvancedServiceOptions(
                !showAdvancedServiceOptions
              )
            }
            className="mt-5 flex items-center gap-2 rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-fuchsia-600 transition hover:bg-fuchsia-100"
          >
            <Sparkles className="h-3 w-3" />

            {showAdvancedServiceOptions
              ? 'Hide experience details'
              : 'Add experience details'}

            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                showAdvancedServiceOptions
                  ? 'rotate-180'
                  : ''
              }`}
            />
          </button>

          {showAdvancedServiceOptions && (
            <div className="mt-3 grid gap-3 rounded-2xl border border-pink-100 bg-white/70 p-4 backdrop-blur-xl sm:grid-cols-2">

              <div>
                <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                  What's included
                </label>

                <input
                  value={serviceForm.whatsIncluded}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      whatsIncluded:
                        e.target.value,
                    }))
                  }
                  placeholder="HD Makeup, Hairstyling, Draping"
                  className="w-full rounded-xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10"
                />
              </div>

              <div>
                <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Add-ons
                </label>

                <input
                  value={serviceForm.addons}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      addons: e.target.value,
                    }))
                  }
                  placeholder="Premium lashes +₹500"
                  className="w-full rounded-xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10"
                />
              </div>

              <div>
                <label className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Advance
                </label>

                <div className="flex items-center rounded-xl border border-pink-100 bg-white">

                  <span className="pl-3 text-xs font-black text-fuchsia-400">
                    ₹
                  </span>

                  <input
                    value={serviceForm.advanceAmount}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        advanceAmount:
                          e.target.value,
                      }))
                    }
                    type="number"
                    inputMode="numeric"
                    placeholder="5000"
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 pr-3 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-pink-100 bg-white px-3 py-3">

                <input
                  type="checkbox"
                  checked={
                    serviceForm.isHomeService
                  }
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      isHomeService:
                        e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-fuchsia-500"
                />

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Home service
                  </p>

                  <p className="text-[9px] font-medium text-slate-400">
                    Available at customer's location
                  </p>
                </div>

                <Home className="ml-auto h-4 w-4 text-fuchsia-400" />
              </label>
            </div>
          )}

          {/* ===================================================== */}
          {/* ACTIONS */}
          {/* ===================================================== */}

          <div className="mt-6 flex gap-2">

            {editingServiceId && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveClick}
              disabled={servicesLoading}
              className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.13em] text-white shadow-[0_12px_30px_rgba(217,70,239,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(217,70,239,0.32)] active:scale-[0.98] disabled:opacity-60"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {servicesLoading ? (
                <RefreshCw className="relative h-4 w-4 animate-spin" />
              ) : editingServiceId ? (
                <Save className="relative h-4 w-4" />
              ) : (
                <Plus className="relative h-4 w-4" />
              )}

              <span className="relative">
                {servicesLoading
                  ? 'Saving...'
                  : editingServiceId
                  ? 'Update experience'
                  : 'Publish service'}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PUBLISHED SERVICES */}
        {/* ========================================================= */}

        <div>

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-slate-800">
                <Crown className="h-4 w-4 text-fuchsia-500" />
                Your experiences

                <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[9px] text-fuchsia-600">
                  {filteredServices.length}
                </span>
              </h4>

              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Live services visible on your storefront
              </p>
            </div>
          </div>

          {/* Category filter */}
          {services.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">

              <button
                type="button"
                onClick={() =>
                  setActiveCategoryFilter('all')
                }
                className={`flex-shrink-0 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wider transition ${
                  activeCategoryFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'border border-slate-100 bg-white text-slate-500 hover:border-fuchsia-200 hover:text-fuchsia-600'
                }`}
              >
                All
              </button>

              {Array.from(
                new Set(
                  services.map(
                    (s) => s.category
                  )
                )
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setActiveCategoryFilter(cat)
                  }
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wider transition ${
                    activeCategoryFilter === cat
                      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20'
                      : 'border border-slate-100 bg-white text-slate-500 hover:border-fuchsia-200 hover:text-fuchsia-600'
                  }`}
                >
                  {String(cat).replace(
                    '_',
                    ' '
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty */}
          {services.length === 0 ? (
            <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-fuchsia-200 bg-white/60 py-14 text-center backdrop-blur-xl">

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-100 to-violet-100">
                <Crown className="h-7 w-7 text-fuchsia-400" />
              </div>

              <h4 className="text-sm font-black text-slate-700">
                Your service universe is empty
              </h4>

              <p className="mx-auto mt-2 max-w-sm px-4 text-xs font-medium leading-relaxed text-slate-400">
                Create your first beauty experience and
                start building your client-facing menu.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">

              {filteredServices.map(
                (service) => (
                  <div
                    key={service.id}
                    className={`group relative overflow-hidden rounded-[1.75rem] border bg-white/75 backdrop-blur-xl transition-all duration-300 ${
                      !service.is_active
                        ? 'border-slate-200 opacity-60'
                        : 'border-pink-100/80 hover:-translate-y-1 hover:border-fuchsia-200 hover:shadow-[0_20px_50px_rgba(217,70,239,0.10)]'
                    } ${
                      editingServiceId ===
                      service.id
                        ? 'ring-2 ring-fuchsia-400 ring-offset-2'
                        : ''
                    }`}
                  >

                    {/* Top glow */}
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-400/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />

                    <div className="relative p-5">

                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="mb-3 flex flex-wrap gap-1.5">

                            <span className="rounded-full border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-fuchsia-600">
                              {String(
                                service.category ||
                                  'Beauty'
                              ).replace(
                                '_',
                                ' '
                              )}
                            </span>

                            <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                              <Clock3 className="mr-1 inline h-2.5 w-2.5" />
                              {formatDuration(
                                Number(
                                  service.duration_minutes ||
                                    60
                                )
                              )}
                            </span>
                          </div>

                          <h4 className="text-base font-black leading-tight text-slate-900">
                            {service.title}
                          </h4>
                        </div>

                        {/* Live badge */}
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              service.id,
                              service.is_active
                            )
                          }
                          className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider transition ${
                            service.is_active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              service.is_active
                                ? 'animate-pulse bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          />

                          {service.is_active
                            ? 'Live'
                            : 'Hidden'}
                        </button>
                      </div>

                      {/* Price */}
                      <div className="mt-5 flex items-end gap-2">

                        <span className="text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-fuchsia-600 to-pink-500 bg-clip-text">
                          ₹{service.price}
                        </span>

                        <span className="mb-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                          {service.price_type ===
                          'starting'
                            ? 'Starting'
                            : service.price_type ===
                              'custom'
                            ? 'Custom quote'
                            : 'Fixed'}
                        </span>
                      </div>

                      {/* Includes */}
                      {service.whats_included && (
                        <div className="mt-4">

                          <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Experience includes
                          </p>

                          <div className="flex flex-wrap gap-1.5">

                            {String(
                              service.whats_included
                            )
                              .split(',')
                              .map(
                                (
                                  item: string,
                                  i: number
                                ) => (
                                  <span
                                    key={i}
                                    className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600"
                                  >
                                    <Check className="mr-1 inline h-2.5 w-2.5 text-emerald-500" />
                                    {item.trim()}
                                  </span>
                                )
                              )}
                          </div>
                        </div>
                      )}

                      {/* Advance */}
                      {service.advance_amount && (
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-amber-700">
                          <DollarSign className="h-3 w-3" />
                          ₹{service.advance_amount}{' '}
                          advance
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 border-t border-slate-100/80 bg-slate-50/60 p-1.5">

                      <button
                        type="button"
                        onClick={() =>
                          onEdit(service)
                        }
                        className="group/action flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-white hover:text-violet-600"
                      >
                        <PencilLine className="h-3 w-3 transition-transform group-hover/action:-rotate-12" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDuplicate(service)
                        }
                        className="group/action flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-white hover:text-blue-600"
                      >
                        <Sparkles className="h-3 w-3 transition-transform group-hover/action:scale-125" />
                        Duplicate
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(service.id)
                        }
                        className="group/action flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[8px] font-black uppercase tracking-wider text-rose-400 transition hover:bg-white hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3 transition-transform group-hover/action:scale-110" />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
