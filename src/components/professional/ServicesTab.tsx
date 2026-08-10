// ServicesTab.tsx
//
// Drop-in replacement for the <TabsContent value="services">...</TabsContent>
// block inside ProfessionalProfile.tsx. No mock data — every service shown
// comes from the `services` array that ProfessionalProfile already loads
// from Supabase (`artist_services` table). This component only adds a
// catalog-driven picker to make filling `serviceForm.title` faster; it does
// not read or write anywhere except through the handlers passed in as props.
//
// USAGE in ProfessionalProfile.tsx:
//   import ServicesTab from './ServicesTab';
//   ...
//   <TabsContent value="services">
//     <ServicesTab
//       services={services}
//       servicesLoading={servicesLoading}
//       editingServiceId={editingServiceId}
//       showAdvancedServiceOptions={showAdvancedServiceOptions}
//       setShowAdvancedServiceOptions={setShowAdvancedServiceOptions}
//       serviceForm={serviceForm}
//       setServiceForm={setServiceForm}
//       onSave={handleServiceSave}
//       onEdit={handleServiceEdit}
//       onDuplicate={handleServiceDuplicate}
//       onDelete={handleServiceDelete}
//       onCancelEdit={handleCancelServiceEdit}
//       onToggleStatus={toggleServiceStatus}
//     />
//   </TabsContent>

import React, { useMemo, useState } from 'react';
import {
  Sparkles, Globe, DollarSign, RefreshCw, Save, Plus, PencilLine,
  Trash2, Crown, Search, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_CATALOG, searchServiceCatalog, ServiceCatalogEntry } from './serviceCatalog';

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
  onToggleStatus: (serviceId: string, currentStatus: boolean) => void | Promise<void>;
}

const DURATION_PRESETS = [30, 45, 60, 90, 120, 180];

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
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const catalogResults = useMemo(
    () => (catalogQuery ? searchServiceCatalog(catalogQuery, 10) : []),
    [catalogQuery]
  );

  const liveCount = services.filter((s) => s.is_active).length;
  const avgPrice = services.length
    ? Math.round(services.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / services.length)
    : 0;

  const filteredServices =
    activeCategoryFilter === 'all'
      ? services
      : services.filter((s) => s.category === activeCategoryFilter);

  const pickCatalogEntry = (entry: ServiceCatalogEntry) => {
    setServiceForm((prev) => ({ ...prev, title: entry.name }));
    setCatalogQuery('');
    setShowCatalog(false);
  };

  const handleSaveClick = () => {
    if (!serviceForm.title || !serviceForm.price) {
      toast.error('Service name and price are required');
      return;
    }
    void onSave();
  };

  return (
    <div className="space-y-6 rounded-3xl border border-pink-100 bg-white p-4 sm:p-6 shadow-sm">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800">
            <Sparkles className="h-4 w-4 text-fuchsia-500" />
            Signature services & rate card
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            What clients see when they book you. Search the catalog or type your own name.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info('Opening customer preview...')}
          className="flex items-center justify-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-purple-600 transition hover:bg-purple-100 active:scale-95"
        >
          <Globe className="h-3.5 w-3.5" /> Preview as customer
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 p-3 sm:p-4 text-white shadow-lg shadow-pink-500/20">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-100">Total</p>
          <p className="text-xl sm:text-2xl font-black">{services.length}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 sm:p-4 text-white shadow-lg shadow-emerald-500/20">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">Live now</p>
          <p className="text-xl sm:text-2xl font-black">{liveCount}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-3 sm:p-4 text-white shadow-lg shadow-violet-500/20">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-violet-100">Avg price</p>
          <p className="text-xl sm:text-2xl font-black">₹{avgPrice}</p>
        </div>
      </div>

      {/* Add / edit form */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 shadow-sm transition-all ${
          editingServiceId
            ? 'border-fuchsia-300 bg-fuchsia-50/40'
            : 'border-pink-200 bg-gradient-to-br from-pink-50/80 to-white'
        }`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-pink-100/60 pb-3">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-fuchsia-600">
            {editingServiceId ? <PencilLine className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
            {editingServiceId ? 'Editing service' : 'Add new service'}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active</span>
            <input
              type="checkbox"
              checked={serviceForm.isActive}
              onChange={(e) => setServiceForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-200 transition-colors checked:bg-emerald-500 relative after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform checked:after:translate-x-4"
            />
          </label>
        </div>

        {/* Service name with catalog search */}
        <div className="relative">
          <label className="ml-1 mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Service name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={serviceForm.title}
              onChange={(e) => {
                setServiceForm((prev) => ({ ...prev, title: e.target.value }));
                setCatalogQuery(e.target.value);
                setShowCatalog(true);
              }}
              onFocus={() => setShowCatalog(true)}
              placeholder="Search or type e.g. Bridal HD Makeup"
              className="w-full rounded-2xl border border-pink-200 bg-white py-3 pl-10 pr-9 text-sm font-bold shadow-sm outline-none focus:border-fuchsia-400"
            />
            {serviceForm.title && (
              <button
                type="button"
                onClick={() => {
                  setServiceForm((prev) => ({ ...prev, title: '' }));
                  setCatalogQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear service name"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showCatalog && catalogResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-xl">
              {catalogResults.map((entry) => (
                <button
                  key={`${entry.categoryId}-${entry.name}`}
                  type="button"
                  onClick={() => pickCatalogEntry(entry)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50"
                >
                  <span>{entry.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                    {entry.categoryId.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category chip picker */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {SERVICE_CATALOG.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setServiceForm((prev) => ({ ...prev, category: cat.id }))}
              className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
                serviceForm.category === cat.id
                  ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md'
                  : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Price row */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="ml-1 mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Price type
            </label>
            <select
              value={serviceForm.priceType}
              onChange={(e) => setServiceForm((prev) => ({ ...prev, priceType: e.target.value }))}
              className="w-full rounded-2xl border border-pink-200 bg-white px-3 py-3 text-sm font-bold text-slate-600 shadow-sm outline-none"
            >
              <option value="fixed">Fixed price</option>
              <option value="starting">Starts at</option>
              <option value="custom">Custom quote</option>
            </select>
          </div>
          <div className="sm:col-span-7">
            <label className="ml-1 mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Price (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                value={serviceForm.price}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                type="number"
                inputMode="numeric"
                placeholder="5000"
                className="w-full rounded-2xl border border-pink-200 bg-white py-3 pl-8 pr-4 text-sm font-bold shadow-sm outline-none focus:border-fuchsia-400"
              />
            </div>
          </div>
        </div>

        {/* Duration presets */}
        <div className="mt-4">
          <label className="ml-1 mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setServiceForm((prev) => ({ ...prev, duration: String(mins) }))}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  serviceForm.duration === String(mins)
                    ? 'bg-fuchsia-500 text-white shadow-sm'
                    : 'bg-white border border-pink-200 text-slate-600 hover:bg-pink-50'
                }`}
              >
                {mins >= 60 ? `${mins / 60}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`}
              </button>
            ))}
            <input
              value={serviceForm.duration}
              onChange={(e) => setServiceForm((prev) => ({ ...prev, duration: e.target.value }))}
              type="number"
              inputMode="numeric"
              placeholder="Custom (mins)"
              className="w-28 rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-fuchsia-400"
            />
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedServiceOptions(!showAdvancedServiceOptions)}
          className="mt-4 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-fuchsia-500 hover:text-fuchsia-700"
        >
          {showAdvancedServiceOptions ? 'Hide inclusions & advance ▴' : 'Add inclusions, add-ons & advance ▾'}
        </button>

        {showAdvancedServiceOptions && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-pink-100 bg-white/70 p-4 sm:grid-cols-2">
            <div>
              <label className="ml-1 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                What's included (comma separated)
              </label>
              <input
                value={serviceForm.whatsIncluded}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, whatsIncluded: e.target.value }))}
                placeholder="HD Makeup, Hairstyling, Draping"
                className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-xs font-bold shadow-sm outline-none focus:border-fuchsia-400"
              />
            </div>
            <div>
              <label className="ml-1 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Add-ons (optional up-sells)
              </label>
              <input
                value={serviceForm.addons}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, addons: e.target.value }))}
                placeholder="Premium lashes +₹500"
                className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-xs font-bold shadow-sm outline-none focus:border-fuchsia-400"
              />
            </div>
            <div className="relative">
              <label className="ml-1 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Advance amount (₹)
              </label>
              <span className="absolute left-3 top-[34px] text-xs font-bold text-slate-400">₹</span>
              <input
                value={serviceForm.advanceAmount}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, advanceAmount: e.target.value }))}
                type="number"
                inputMode="numeric"
                placeholder="5000"
                className="w-full rounded-xl border border-pink-200 bg-white py-2.5 pl-7 pr-3 text-xs font-bold shadow-sm outline-none"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">
              <input
                type="checkbox"
                checked={serviceForm.isHomeService}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, isHomeService: e.target.checked }))}
                className="h-4 w-4 accent-pink-500"
              />
              Offer as home service
            </label>
          </div>
        )}

        {/* Save / cancel */}
        <div className="mt-5 flex items-center gap-3 sm:ml-auto sm:w-1/2">
          {editingServiceId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-1/3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={servicesLoading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all disabled:opacity-50 ${
              editingServiceId
                ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-fuchsia-500/30'
                : 'bg-gradient-to-r from-pink-500 to-fuchsia-500 shadow-pink-500/30 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {servicesLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : editingServiceId ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingServiceId ? 'Update service' : 'Add to rate card'}
          </button>
        </div>
      </div>

      {/* Published services list */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-800">
            Your published services
            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-pink-600">
              {filteredServices.length}
            </span>
          </h4>
        </div>

        {services.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                activeCategoryFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {Array.from(new Set(services.map((s) => s.category))).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                  activeCategoryFilter === cat
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {String(cat).replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50/40 py-10">
            <Crown className="mb-3 h-10 w-10 text-pink-300" />
            <p className="text-sm font-bold text-slate-600">Your rate card is empty</p>
            <p className="mt-1 max-w-sm text-center text-xs text-slate-400">
              Search the catalog above or type your own service to start taking bookings.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all ${
                  !service.is_active ? 'opacity-70' : 'hover:shadow-md hover:border-pink-300'
                } ${editingServiceId === service.id ? 'ring-2 ring-fuchsia-400 ring-offset-2' : 'border-pink-100'}`}
              >
                <div className="flex-1 p-4 sm:p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <span className="mb-2 inline-block rounded-md bg-purple-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-purple-600">
                        {String(service.category || '').replace('_', ' ')} · {service.duration_minutes || 60} min
                      </span>
                      <h4 className="text-sm sm:text-base font-black leading-tight text-slate-900">
                        {service.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => onToggleStatus(service.id, service.is_active)}
                      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                        service.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${service.is_active ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                      {service.is_active ? 'Live' : 'Hidden'}
                    </button>
                  </div>

                  <div className="mb-3 mt-3 flex items-end gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-pink-600">₹{service.price}</h3>
                    <span className="mb-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {service.price_type === 'starting' ? 'Starting from' : service.price_type === 'custom' ? 'Custom quote' : 'Fixed price'}
                    </span>
                  </div>

                  {service.whats_included && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Includes</p>
                      <div className="flex flex-wrap gap-1">
                        {String(service.whats_included).split(',').map((item: string, i: number) => (
                          <span key={i} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {item.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.advance_amount && (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                      <DollarSign className="h-3 w-3" /> ₹{service.advance_amount} advance required
                    </div>
                  )}
                </div>

                <div className="flex items-center border-t border-slate-50 bg-slate-50/50 p-2">
                  <button
                    type="button"
                    onClick={() => onEdit(service)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white hover:text-purple-600"
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Edit
                  </button>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => onDuplicate(service)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white hover:text-blue-600"
                  >
                    Duplicate
                  </button>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => onDelete(service.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-white hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
