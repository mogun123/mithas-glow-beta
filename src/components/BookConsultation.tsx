import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, CreditCard, User, Phone, Mail, Check, X, AlertCircle } from 'lucide-react';
// Import DoctorProfile interface definition
interface DoctorProfile {
  id: string;
  full_name: string;
  specialization: string;
  license_number: string;
  years_of_experience: number;
  medical_degree: string;
  university: string;
  board_certifications: string[];
  specializations: string[];
  clinic_name: string;
  clinic_address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  consultation_fee: number;
  currency: string;
  available_services: string[];
  available_days: string[];
  time_slots: {
    morning: string[];
    afternoon: string[];
    evening: string[];
  };
  consultation_duration: number;
  average_rating: number;
  total_consultations: number;
  is_verified: boolean;
  verification_status: string;
  bio: string;
  profile_image_url: string;
  languages_spoken: string[];
  is_active: boolean;
  is_accepting_patients: boolean;
}

interface BookConsultationProps {
  doctor: DoctorProfile;
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed?: (consultation: any) => void;
  userId?: string;
  journeyId?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingFormData {
  consultation_type: string;
  scheduled_date: string;
  time_slot: string;
  chief_complaint: string;
  medical_history: string;
  current_medications: string;
  allergies: string;
  skin_concerns: string[];
  payment_method: string;
}

const BookConsultation: React.FC<BookConsultationProps> = ({
  doctor,
  isOpen,
  onClose,
  onBookingConfirmed,
  userId,
  journeyId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingFormData>({
    consultation_type: 'general',
    scheduled_date: '',
    time_slot: '',
    chief_complaint: '',
    medical_history: '',
    current_medications: '',
    allergies: '',
    skin_concerns: [],
    payment_method: 'online'
  });

  const consultationTypes = [
    { value: 'general', label: 'General Consultation', description: 'Overall skin health assessment' },
    { value: 'acne', label: 'Acne Treatment', description: 'Specialized acne care and treatment' },
    { value: 'anti_aging', label: 'Anti-Aging', description: 'Preventive and corrective treatments' },
    { value: 'pigmentation', label: 'Pigmentation', description: 'Dark spots and uneven tone treatment' },
    { value: 'hair_loss', label: 'Hair Loss', description: 'Hair and scalp consultation' },
    { value: 'other', label: 'Other Concern', description: 'Custom consultation based on needs' }
  ];

  const skinConcernOptions = [
    'Acne', 'Redness', 'Pigmentation', 'Wrinkles', 'Dryness', 'Oily Skin',
    'Sensitive Skin', 'Dark Circles', 'Hair Loss', 'Scars', 'Other'
  ];

  useEffect(() => {
    if (isOpen && doctor) {
      // Reset form when modal opens
      setStep(1);
      setError(null);
      setSelectedDate('');
      setSelectedTimeSlot('');
      setAvailableTimeSlots([]);
      setBookingData({
        consultation_type: 'general',
        scheduled_date: '',
        time_slot: '',
        chief_complaint: '',
        medical_history: '',
        current_medications: '',
        allergies: '',
        skin_concerns: [],
        payment_method: 'online'
      });
    }
  }, [isOpen, doctor]);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const generateTimeSlots = (date: string) => {
    const slots: TimeSlot[] = [];
    const dayOfWeek = new Date(date).getDay();
    
    // Check if doctor is available on this day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (!doctor.available_days.includes(dayName)) {
      setAvailableTimeSlots([]);
      return;
    }

    // Generate time slots based on doctor's availability
    const timeRanges = doctor.time_slots || {
      morning: ['09:00', '10:00', '11:00'],
      afternoon: ['14:00', '15:00', '16:00'],
      evening: ['17:00', '18:00']
    };

    Object.entries(timeRanges).forEach(([period, times]: [string, string[]]) => {
      times.forEach((time: string) => {
        slots.push({
          time,
          available: Math.random() > 0.3 // 70% availability for demo
        });
      });
    });

    setAvailableTimeSlots(slots);
  };

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot('');
    setBookingData(prev => ({ ...prev, scheduled_date: date }));
  };

  const handleTimeSlotSelection = (time: string) => {
    setSelectedTimeSlot(time);
    setBookingData(prev => ({ ...prev, time_slot: time }));
  };

  const handleSkinConcernToggle = (concern: string) => {
    setBookingData(prev => ({
      ...prev,
      skin_concerns: prev.skin_concerns.includes(concern)
        ? prev.skin_concerns.filter(c => c !== concern)
        : [...prev.skin_concerns, concern]
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return bookingData.consultation_type && bookingData.chief_complaint;
      case 2:
        return selectedDate && selectedTimeSlot;
      case 3:
        return bookingData.skin_concerns.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError('Please login to book a consultation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create consultation record
      const consultationData = {
        user_id: userId,
        doctor_id: doctor.id,
        journey_id: journeyId || null,
        consultation_type: bookingData.consultation_type,
        scheduled_date: new Date(`${selectedDate} ${selectedTimeSlot}`).toISOString(),
        duration: doctor.consultation_duration || 30,
        chief_complaint: bookingData.chief_complaint,
        medical_history: {
          conditions: bookingData.medical_history,
          medications: bookingData.current_medications,
          allergies: bookingData.allergies
        },
        skin_concerns: bookingData.skin_concerns,
        consultation_fee: doctor.consultation_fee,
        payment_status: 'pending',
        payment_method: bookingData.payment_method,
        session_type: 'video',
        status: 'booked'
      };

      const { data, error: insertError } = await supabase
        .from('consultations')
        .insert(consultationData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update doctor's total consultations
      await supabase
        .from('doctor_profiles')
        .update({
          total_consultations: doctor.total_consultations + 1
        })
        .eq('id', doctor.id);

      onBookingConfirmed?.(data);
      onClose();
    } catch (err: any) {
      console.error('Error booking consultation:', err);
      setError(err.message || 'Failed to book consultation');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Minimum 1 day in advance
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Maximum 30 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Book Consultation</h2>
              <p className="text-sm text-gray-600 mt-1">Dr. {doctor.full_name} - {doctor.specialization}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stepNumber < step ? <Check className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      step > stepNumber ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Consultation</span>
            <span className="text-xs text-gray-600">Schedule</span>
            <span className="text-xs text-gray-600">Concerns</span>
            <span className="text-xs text-gray-600">Confirm</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Consultation Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type
                </label>
                <div className="space-y-2">
                  {consultationTypes.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="consultation_type"
                        value={type.value}
                        checked={bookingData.consultation_type === type.value}
                        onChange={(e) => setBookingData(prev => ({ ...prev, consultation_type: e.target.value }))}
                        className="mt-1"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chief Complaint <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={bookingData.chief_complaint}
                  onChange={(e) => setBookingData(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  placeholder="Describe your main skin concern..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History (Optional)
                </label>
                <textarea
                  value={bookingData.medical_history}
                  onChange={(e) => setBookingData(prev => ({ ...prev, medical_history: e.target.value }))}
                  placeholder="Any relevant medical conditions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <input
                    type="text"
                    value={bookingData.current_medications}
                    onChange={(e) => setBookingData(prev => ({ ...prev, current_medications: e.target.value }))}
                    placeholder="List current medications"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={bookingData.allergies}
                    onChange={(e) => setBookingData(prev => ({ ...prev, allergies: e.target.value }))}
                    placeholder="Any known allergies"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelection(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available days: {doctor.available_days.join(', ')}
                </p>
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && handleTimeSlotSelection(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                          selectedTimeSlot === slot.time
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : slot.available
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot.time}
                        </div>
                        {!slot.available && (
                          <div className="text-xs">Unavailable</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Consultation Details</h4>
                <div className="space-y-1 text-sm text-purple-700">
                  <div>Duration: {doctor.consultation_duration || 30} minutes</div>
                  <div>Fee: ${doctor.consultation_fee}</div>
                  <div>Type: Video consultation</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Skin Concerns */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Skin Concerns <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {skinConcernOptions.map((concern) => (
                    <label
                      key={concern}
                      className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={bookingData.skin_concerns.includes(concern)}
                        onChange={() => handleSkinConcernToggle(concern)}
                        className="mr-2"
                      />
                      <span className="text-sm">{concern}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={bookingData.payment_method === 'online'}
                      onChange={(e) => setBookingData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="mr-2"
                    />
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Online Payment</span>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="clinic"
                      checked={bookingData.payment_method === 'clinic'}
                      onChange={(e) => setBookingData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="mr-2"
                    />
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Pay at Clinic</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Booking Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium">Dr. {doctor.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Specialization:</span>
                    <span className="font-medium">{doctor.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {consultationTypes.find(t => t.value === bookingData.consultation_type)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{selectedTimeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{doctor.consultation_duration || 30} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium text-green-600">${doctor.consultation_fee}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>You'll receive a confirmation email with details</li>
                  <li>Video link will be sent 24 hours before consultation</li>
                  <li>Have your skin concerns ready for discussion</li>
                  <li>Payment will be processed before the consultation</li>
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Cancellation Policy</h4>
                <p className="text-sm text-gray-600">
                  Free cancellation up to 24 hours before the consultation. 
                  Late cancellations may incur a fee.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={step === 1 ? onClose : handlePrevious}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {step === 1 ? 'Cancel' : 'Previous'}
            </button>

            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookConsultation;
