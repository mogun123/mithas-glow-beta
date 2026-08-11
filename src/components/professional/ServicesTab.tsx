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
    <div className="relative min-h-full overflow-hidden rounded-2xl border border-pink-100 bg-[#faf5ff] p-3 sm:p-5">

      <div className="relative space-y-4">

        {/* ========================================================= */}
        {/* HERO HEADER */}
        {/* ========================================================= */}

        <div className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white/90 p-4 shadow-[0_8px_30px_rgba(236,72,153,0.08)] backdrop-blur-xl">

          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br from-pink-500/10 to-purple-500/10" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50/50 px-2.5 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink-500" />
                </span>

                <span className="text-[8px] font-black uppercase tracking-widest text-pink-600">
                  AI Beauty Studio
                </span>
              </div>

              <h3 className="flex items-center gap-1.5 text-lg font-black tracking-tight text-slate-900">
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Service Studio
                </span>

                <Sparkles className="h-4 w-4 text-pink-500" />
              </h3>

              <p className="mt-0.5 max-w-xl text-[10px] font-medium leading-relaxed text-slate-600">
                Build your premium service menu and let clients book your beauty experiences.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toast.info('Customer preview will open here.')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-300 hover:text-pink-600 active:scale-95"
            >
              <Globe className="h-3.5 w-3.5" />
              Preview Storefront
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIVE ANALYTICS */}
        {/* ========================================================= */}

        <div className="grid grid-cols-3 gap-2">

          {/* Total */}
          <div className="rounded-xl border border-pink-100 bg-white p-3 shadow-[0_8px_30px_rgba(236,72,153,0.08)] backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                Services
              </span>
              <Sparkles className="h-3 w-3 text-pink-500" />
            </div>
            <p className="text-lg font-black text-slate-900">
              {services.length}
            </p>
            <p className="mt-0.5 text-[8px] font-bold text-slate-400">
              Total catalog
            </p>
          </div>

          {/* Live */}
          <div className="rounded-xl border border-purple-100 bg-white p-3 shadow-[0_8px_30px_rgba(236,72,153,0.08)] backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                Live
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-lg font-black text-slate-900">
              {liveCount}
            </p>
            <p className="mt-0.5 text-[8px] font-bold text-slate-400">
              Visible to clients
            </p>
          </div>

          {/* Average */}
          <div className="rounded-xl border border-pink-100 bg-white p-3 shadow-[0_8px_30px_rgba(236,72,153,0.08)] backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                Avg price
              </span>
              <DollarSign className="h-3 w-3 text-purple-500" />
            </div>
            <p className="text-lg font-black text-slate-900">
              ₹{avgPrice}
            </p>
            <p className="mt-0.5 text-[8px] font-bold text-slate-400">
              Across your menu
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CREATE SERVICE */}
        {/* ========================================================= */}

        <div
          className={`relative rounded-2xl border p-4 shadow-[0_8px_30px_rgba(236,72,153,0.08)] backdrop-blur-xl transition-all ${
            editingServiceId
              ? 'border-purple-300 bg-white'
              : 'border-pink-100 bg-white/50'
          }`}
        >

          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-pink-100 pb-3">

            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg">
                  {editingServiceId ? (
                    <PencilLine className="h-3 w-3" />
                  ) : (
                    <WandSparkles className="h-3 w-3" />
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {editingServiceId ? 'Edit experience' : 'Create experience'}
                  </h4>
                  <p className="text-[9px] font-medium text-slate-500">
                    Add a service to your public rate card
                  </p>
                </div>
              </div>
            </div>

            {/* Live toggle */}
            <label className="flex cursor-pointer items-center gap-1.5">
              <span className="hidden text-[8px] font-black uppercase tracking-widest text-slate-500 sm:block">
                {serviceForm.isActive ? 'Live' : 'Hidden'}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full border border-pink-200 bg-pink-50 transition-all peer-checked:border-pink-400 peer-checked:bg-pink-500" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
            </label>
          </div>

          {/* ===================================================== */}
          {/* AI SEARCH */}
          {/* ===================================================== */}

          <div className="relative">
            <label className="mb-1.5 ml-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
              <Sparkles className="h-2.5 w-2.5 text-pink-500" />
              Service intelligence
            </label>

            <div className="relative flex items-center rounded-xl border border-pink-200 bg-white shadow-sm transition-all focus-within:border-pink-400 focus-within:shadow-[0_0_10px_rgba(236,72,153,0.2)]">
              <Search className="ml-3 h-3.5 w-3.5 text-pink-500" />
              <input
                value={serviceForm.title}
                onChange={(e) => {
                  setServiceForm((prev) => ({ ...prev, title: e.target.value }));
                  setCatalogQuery(e.target.value);
                  setShowCatalog(true);
                }}
                onFocus={() => setShowCatalog(true)}
                placeholder="Search a service..."
                className="w-full bg-transparent px-2.5 py-2.5 text-[11px] font-bold text-slate-900 outline-none placeholder:text-slate-400"
              />
              {serviceForm.title && (
                <button
                  type="button"
                  onClick={() => {
                    setServiceForm((prev) => ({ ...prev, title: '' }));
                    setCatalogQuery('');
                  }}
                  className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-50 text-slate-500 transition hover:bg-pink-100 hover:text-pink-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Catalog Dropdown */}
            {showCatalog && catalogResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-pink-200 bg-white/95 shadow-lg backdrop-blur-xl">
                <div className="border-b border-pink-100 px-3 py-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Suggested services</span>
                </div>
                {catalogResults.map((entry) => (
                  <button
                    key={`${entry.categoryId}-${entry.name}`}
                    type="button"
                    onClick={() => pickCatalogEntry(entry)}
                    className="flex w-full items-center justify-between border-b border-pink-50 px-3 py-2.5 text-left transition hover:bg-pink-50"
                  >
                    <span className="text-[10px] font-bold text-slate-900">{entry.name}</span>
                    <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-purple-600">
                      {entry.categoryId.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* CATEGORY */}
          {/* ===================================================== */}

          <div className="mt-4">
            <label className="mb-1.5 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">Experience category</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {SERVICE_CATALOG.map((cat) => {
                const selected = serviceForm.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceForm((prev) => ({ ...prev, category: cat.id }))}
                    className={`flex flex-shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[9px] font-black transition-all ${
                      selected
                        ? 'border-pink-300 bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                        : 'border-pink-100 bg-white text-slate-600 hover:border-pink-300 hover:text-pink-600'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                    {selected && <Check className="h-2.5 w-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================================================== */}
          {/* PRICE & MODEL */}
          {/* ===================================================== */}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">Pricing model</label>
              <div className="relative">
                <select
                  value={serviceForm.priceType}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, priceType: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-pink-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-900 outline-none transition focus:border-pink-400"
                >
                  <option value="fixed">Fixed price</option>
                  <option value="starting">Starts at</option>
                  <option value="custom">Custom quote</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">Price</label>
              <div className="flex items-center rounded-xl border border-pink-200 bg-white transition focus-within:border-pink-400">
                <span className="pl-3 text-[11px] font-black text-pink-500">₹</span>
                <input
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                  type="number"
                  inputMode="numeric"
                  placeholder="5000"
                  className="min-w-0 flex-1 bg-transparent px-1.5 py-2 pr-3 text-[11px] font-bold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* DURATION */}
          {/* ===================================================== */}

          <div className="mt-4">
            <label className="mb-1.5 ml-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
              <Clock3 className="h-2.5 w-2.5 text-pink-500" /> Duration
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((mins) => {
                const selected = serviceForm.duration === String(mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setServiceForm((prev) => ({ ...prev, duration: String(mins) }))}
                    className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black transition-all ${
                      selected
                        ? 'border-pink-300 bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                        : 'border-pink-100 bg-white text-slate-600 hover:border-pink-300 hover:text-pink-600'
                    }`}
                  >
                    {selected && <Check className="mr-0.5 inline h-2.5 w-2.5" />}
                    {formatDuration(mins)}
                  </button>
                );
              })}
              <input
                value={serviceForm.duration}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, duration: e.target.value }))}
                type="number"
                inputMode="numeric"
                placeholder="Mins"
                className="w-16 rounded-lg border border-pink-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-900 outline-none transition focus:border-pink-400"
              />
            </div>
          </div>

          {/* ===================================================== */}
          {/* ADVANCED OPTIONS */}
          {/* ===================================================== */}

          <button
            type="button"
            onClick={() => setShowAdvancedServiceOptions(!showAdvancedServiceOptions)}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-pink-200 bg-white px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-pink-50"
          >
            <Sparkles className="h-2.5 w-2.5" />
            {showAdvancedServiceOptions ? 'Hide details' : 'Add details'}
            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showAdvancedServiceOptions ? 'rotate-180' : ''}`} />
          </button>

          {showAdvancedServiceOptions && (
            <div className="mt-2 grid gap-2 rounded-xl border border-pink-100 bg-white p-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">What's included</label>
                <input
                  value={serviceForm.whatsIncluded}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, whatsIncluded: e.target.value }))}
                  placeholder="HD Makeup, Draping"
                  className="w-full rounded-lg border border-pink-200 bg-pink-50/80 px-2.5 py-2 text-[10px] font-bold text-slate-900 outline-none transition focus:border-pink-400"
                />
              </div>
              <div>
                <label className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">Add-ons</label>
                <input
                  value={serviceForm.addons}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, addons: e.target.value }))}
                  placeholder="Lashes +₹500"
                  className="w-full rounded-lg border border-pink-200 bg-pink-50/80 px-2.5 py-2 text-[10px] font-bold text-slate-900 outline-none transition focus:border-pink-400"
                />
              </div>
              <div>
                <label className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">Advance</label>
                <div className="flex items-center rounded-lg border border-pink-200 bg-pink-50/80">
                  <span className="pl-2 text-[10px] font-black text-pink-500">₹</span>
                  <input
                    value={serviceForm.advanceAmount}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, advanceAmount: e.target.value }))}
                    type="number"
                    inputMode="numeric"
                    placeholder="2000"
                    className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[10px] font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-pink-200 bg-pink-50/80 px-2.5 py-2">
                <input
                  type="checkbox"
                  checked={serviceForm.isHomeService}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, isHomeService: e.target.checked }))}
                  className="h-3 w-3 accent-pink-500"
                />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-pink-200">Home service</p>
                </div>
                <Home className="ml-auto h-3 w-3 text-pink-500" />
              </label>
            </div>
          )}

          {/* ===================================================== */}
          {/* ACTIONS */}
          {/* ===================================================== */}

          <div className="mt-4 flex gap-2">
            {editingServiceId && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-xl border border-pink-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:bg-pink-50 active:scale-95"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={servicesLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all hover:scale-[0.98] disabled:opacity-60"
            >
              {servicesLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : editingServiceId ? <Save className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {servicesLoading ? 'Saving...' : editingServiceId ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PUBLISHED SERVICES LIST */}
        {/* ========================================================= */}

        <div>
          <div className="mb-3">
            <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900">
              <Crown className="h-3 w-3 text-pink-500" />
              Your experiences
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[8px] text-purple-600">
                {filteredServices.length}
              </span>
            </h4>
            <p className="mt-0.5 text-[9px] font-medium text-slate-500/70">
              Live services visible on storefront
            </p>
          </div>

          {/* Category Filter for Listed Services */}
          {services.length > 0 && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition ${
                  activeCategoryFilter === 'all'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'border border-pink-100 bg-white/60 text-slate-500 hover:bg-pink-50'
                }`}
              >
                All
              </button>
              {Array.from(new Set(services.map((s) => s.category))).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition ${
                    activeCategoryFilter === cat
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                      : 'border border-pink-100 bg-white/60 text-slate-500 hover:bg-pink-50'
                  }`}
                >
                  {String(cat).replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 py-8 text-center backdrop-blur-xl">
              <Crown className="mx-auto mb-2 h-6 w-6 text-pink-500/50" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-200">Menu is empty</h4>
              <p className="mt-1 text-[9px] text-slate-500/60">Create your first beauty experience above.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`relative overflow-hidden rounded-2xl border bg-pink-50/60 backdrop-blur-xl transition-all ${
                    !service.is_active ? 'border-pink-500/10 opacity-60' : 'border-pink-200 hover:border-pink-400/50'
                  } ${editingServiceId === service.id ? 'ring-1 ring-pink-400' : ''}`}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          <span className="rounded-md border border-purple-200 bg-white/80 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-purple-600">
                            {String(service.category || 'Beauty').replace('_', ' ')}
                          </span>
                          <span className="rounded-md border border-pink-200 bg-white/80 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-pink-600">
                            <Clock3 className="mr-0.5 inline h-2 w-2" />
                            {formatDuration(Number(service.duration_minutes || 60))}
                          </span>
                        </div>
                        <h4 className="text-[11px] font-black leading-tight text-slate-900">{service.title}</h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(service.id, service.is_active)}
                        className={`flex flex-shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest transition ${
                          service.is_active
                            ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-900/40 text-slate-400'
                        }`}
                      >
                        <span className={`h-1 w-1 rounded-full ${service.is_active ? 'animate-pulse bg-emerald-400' : 'bg-slate-400'}`} />
                        {service.is_active ? 'Live' : 'Hidden'}
                      </button>
                    </div>

                    <div className="mt-2 flex items-end gap-1.5">
                      <span className="text-sm font-black text-pink-500">₹{service.price}</span>
                      <span className="mb-0.5 text-[7px] font-black uppercase tracking-widest text-slate-500/70">
                        {service.price_type === 'starting' ? 'Starting' : service.price_type === 'custom' ? 'Custom quote' : 'Fixed'}
                      </span>
                    </div>

                    {service.whats_included && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {String(service.whats_included).split(',').map((item: string, i: number) => (
                            <span key={i} className="rounded-md border border-pink-100 bg-white/60 px-1.5 py-0.5 text-[8px] font-bold text-pink-200">
                              <Check className="mr-0.5 inline h-2 w-2 text-pink-500" />
                              {item.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {service.advance_amount && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-950/40 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-purple-600">
                        ₹{service.advance_amount} advance
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 border-t border-pink-100 bg-white/80">
                    <button type="button" onClick={() => onEdit(service)} className="flex items-center justify-center gap-1 py-1.5 text-[7px] font-black uppercase tracking-widest text-slate-500 hover:bg-pink-50 hover:text-pink-600 transition">
                      <PencilLine className="h-2.5 w-2.5" /> Edit
                    </button>
                    <button type="button" onClick={() => onDuplicate(service)} className="flex items-center justify-center gap-1 py-1.5 text-[7px] font-black uppercase tracking-widest text-slate-500 border-l border-r border-pink-100 hover:bg-pink-50 hover:text-purple-600 transition">
                      <Sparkles className="h-2.5 w-2.5" /> Duplicate
                    </button>
                    <button type="button" onClick={() => onDelete(service.id)} className="flex items-center justify-center gap-1 py-1.5 text-[7px] font-black uppercase tracking-widest text-rose-400 hover:bg-pink-50 hover:text-rose-500 transition">
                      <Trash2 className="h-2.5 w-2.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
