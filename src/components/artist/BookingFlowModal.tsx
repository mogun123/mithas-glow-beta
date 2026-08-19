import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, MapPin, CheckCircle, AlertCircle, 
  ChevronRight, ArrowLeft, Sparkles, ShieldCheck 
} from 'lucide-react';
import type { Artist, ArtistService } from '../../../hooks/use-booking';
import { useAvailableSlots, useCreateBooking } from '../../../hooks/use-booking';
import { toast } from 'sonner';

interface BookingFlowModalProps {
  artist: Artist;
  services: ArtistService[];
  initialService?: ArtistService | null;
  userId: string;
  travelChargeConfig?: number | null;
  cancellationPolicyConfig?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: () => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  artist,
  services,
  initialService,
  userId,
  travelChargeConfig,
  cancellationPolicyConfig,
  isOpen,
  onClose,
  onBookingSuccess,
}) => {
  const [selectedService, setSelectedService] = useState<ArtistService | null>(initialService || null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<"studio" | "home">("studio");
  const [specialNotes, setSpecialNotes] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const artistId = artist.id;
  const { slots, loading: slotsLoading } = useAvailableSlots(artistId, selectedDate);
  const { createBooking } = useCreateBooking();

  // Next 7 available dates
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
    } else if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [initialService, services]);

  // Reset time slot when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

  if (!isOpen) return null;

  // Real travel charge from artist shop config (or 0 if not configured/studio)
  const realTravelCharge = locationType === "home" ? (travelChargeConfig ?? 0) : 0;
  const basePrice = selectedService?.price || 0;
  const totalAmount = basePrice + realTravelCharge;
  const advancePayable = Math.round(totalAmount * 0.20); // 20% advance payment

  const handleConfirmBooking = async () => {
    if (!userId) {
      toast.error("Please sign in to book an appointment");
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Please select a service, date, and time slot");
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking(
        userId,
        artistId,
        selectedService.id,
        selectedService.title,
        selectedService.price,
        selectedDate,
        selectedTime,
        specialNotes.trim()
      );

      toast.success("Booking confirmed successfully! 🎉");
      onBookingSuccess();
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = artist.shop_name || artist.full_name || artist.username || 'Artist';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Sheet Container */}
      <div
        className="relative bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl z-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 bg-white z-20 px-4 py-3 border-b border-pink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 font-bold text-xs">
              💄
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Book Appointment</h3>
              <p className="text-[10px] text-slate-500 font-medium">with {displayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Step 1: Select Service */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 block flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-pink-500" />
              1. Select Service
            </label>
            <div className="space-y-1.5">
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-gradient-to-r from-pink-50/80 to-purple-50/50 ring-1 ring-pink-400/30 shadow-xs'
                        : 'border-slate-100 bg-white hover:border-pink-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[12px] font-bold text-slate-900 truncate">{service.title}</span>
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full font-medium">
                          {service.duration_minutes} min
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1">{service.description}</p>
                      )}
                    </div>
                    <span className="text-[13px] font-extrabold text-slate-900 ml-2.5 flex-shrink-0">
                      ₹{service.price.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Date & Time */}
          {selectedService && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 block flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-purple-500" />
                2. Choose Date & Time
              </label>

              {/* Horizontal Date Picker */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {availableDates.map((date) => {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                  const dayNum = dateObj.getDate();
                  const month = dateObj.toLocaleDateString("en-US", { month: "short" });
                  const isSelected = selectedDate === date;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 py-2 px-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xs scale-102'
                          : 'bg-white border-slate-100 hover:border-pink-200 text-slate-700'
                      }`}
                      style={{ minWidth: "60px" }}
                    >
                      <div className={`text-[8px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                        {dayName}
                      </div>
                      <div className={`text-base font-extrabold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {dayNum}
                      </div>
                      <div className={`text-[8px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                        {month}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              {selectedDate && (
                <div className="mt-2.5">
                  <p className="text-[10px] font-bold text-slate-600 mb-1.5">Available Time Slots:</p>
                  {slotsLoading ? (
                    <div className="py-4 text-center">
                      <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400">Checking slot availability...</span>
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {slots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xs'
                                : 'bg-white border border-slate-100 hover:border-pink-200 text-slate-800'
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-3 px-3 bg-pink-50/50 rounded-xl text-center text-[11px] text-slate-500">
                      No slots open on this date. Please try another date.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Service Location & Notes */}
          {selectedService && selectedDate && selectedTime && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 block flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-500" />
                3. Service Location
              </label>

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => setLocationType("studio")}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    locationType === 'studio'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xs'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-pink-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Studio Visit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocationType("home")}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    locationType === 'home'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xs'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-pink-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Home Service</span>
                </button>
              </div>

              {/* Special Request */}
              <div>
                <label htmlFor="modal-notes" className="text-[10px] font-bold text-slate-600 mb-1 block">
                  Special Notes / Requests
                </label>
                <textarea
                  id="modal-notes"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Any skin allergies, specific product requests..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-300 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Summary & Price Breakdown */}
          {selectedService && selectedDate && selectedTime && (
            <div className="space-y-2.5 pt-1">
              <div className="bg-gradient-to-br from-pink-50/80 to-purple-50/50 rounded-xl p-3 border border-pink-100">
                <h4 className="text-[11px] font-extrabold text-slate-900 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Booking Summary & Breakdown
                </h4>
                
                <div className="space-y-1.5 text-[11px] mb-2.5 pb-2.5 border-b border-pink-100/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service</span>
                    <span className="font-bold text-slate-900">{selectedService.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time</span>
                    <span className="font-bold text-slate-900">{selectedDate} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Price</span>
                    <span className="font-bold text-slate-900">₹{basePrice.toLocaleString()}</span>
                  </div>
                  {locationType === "home" && (
                    <div className="flex justify-between text-pink-600">
                      <span>Travel Charge</span>
                      <span className="font-bold">₹{realTravelCharge.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-1.5 flex justify-between text-xs font-extrabold text-slate-900 border-t border-pink-100">
                    <span>Total Amount</span>
                    <span className="text-pink-600">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Advance Amount Highlight */}
                <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100 text-[11px]">
                  <div>
                    <p className="font-bold text-emerald-800">20% Advance Payable Now</p>
                    <p className="text-[9px] text-emerald-600">Secure slot with instant confirmation</p>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700">₹{advancePayable.toLocaleString()}</span>
                </div>
              </div>

              {/* Cancellation Policy */}
              {cancellationPolicyConfig && (
                <div className="border border-slate-100 rounded-lg overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowPolicy(!showPolicy)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 flex items-center justify-between text-slate-600 font-semibold"
                  >
                    <span>Cancellation Policy</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showPolicy ? 'rotate-90' : ''}`} />
                  </button>
                  {showPolicy && (
                    <div className="p-2.5 bg-white text-slate-500 text-[10px] leading-relaxed">
                      {cancellationPolicyConfig}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Confirm Button */}
        <div className="p-3 bg-white border-t border-pink-100 flex items-center justify-between gap-2.5">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pay Advance</span>
            <span className="text-base font-extrabold text-emerald-600">₹{advancePayable.toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={isSubmitting || !selectedService || !selectedDate || !selectedTime}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <span>Confirm & Book Appointment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
