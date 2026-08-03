import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Video, Phone, User, Star, MessageSquare, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Consultation {
  id: string;
  user_id: string;
  doctor_id: string;
  journey_id?: string;
  consultation_type: string;
  status: 'booked' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  scheduled_date: string;
  duration: number;
  chief_complaint: string;
  medical_history: any;
  skin_concerns: string[];
  consultation_fee: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  payment_method?: string;
  session_type: 'video' | 'audio' | 'chat' | 'in_person';
  meeting_link?: string;
  patient_rating?: number;
  patient_feedback?: string;
  doctor_notes?: string;
  diagnosis?: string;
  treatment_plan?: any;
  prescription?: any;
  follow_up_required: boolean;
  follow_up_date?: string;
  booked_at: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  doctor?: {
    full_name: string;
    specialization: string;
    profile_image_url?: string;
    average_rating: number;
  };
}

interface ConsultationHistoryProps {
  userId: string;
  showFilters?: boolean;
  maxResults?: number;
  onConsultationSelect?: (consultation: Consultation) => void;
  onBookNewConsultation?: () => void;
}

const ConsultationHistory: React.FC<ConsultationHistoryProps> = ({
  userId,
  showFilters = true,
  maxResults = 20,
  onConsultationSelect,
  onBookNewConsultation
}) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'rating'>('date');

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'booked', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'in_progress', label: 'In Progress' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'general', label: 'General' },
    { value: 'acne', label: 'Acne' },
    { value: 'anti_aging', label: 'Anti-Aging' },
    { value: 'pigmentation', label: 'Pigmentation' },
    { value: 'hair_loss', label: 'Hair Loss' }
  ];

  useEffect(() => {
    fetchConsultations();
  }, [statusFilter, typeFilter, sortBy]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('consultations')
        .select(`
          *,
          doctor:doctor_profiles (
            full_name,
            specialization,
            profile_image_url,
            average_rating
          )
        `)
        .eq('user_id', userId);

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'booked') {
          query = query.in('status', ['booked', 'confirmed', 'in_progress']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('consultation_type', typeFilter);
      }

      // Apply sorting
      if (sortBy === 'date') {
        query = query.order('scheduled_date', { ascending: false });
      } else if (sortBy === 'status') {
        query = query.order('status', { ascending: true });
      } else {
        query = query.order('patient_rating', { ascending: false, nullsFirst: false });
      }

      const { data, error: fetchError } = await query.limit(maxResults);

      if (fetchError) {
        throw fetchError;
      }

      setConsultations(data || []);
    } catch (err: any) {
      console.error('Error fetching consultations:', err);
      setError(err.message || 'Failed to load consultation history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'booked':
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-purple-600 bg-purple-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'no_show':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'booked':
      case 'confirmed':
        return <Calendar className="w-4 h-4" />;
      case 'in_progress':
        return <Video className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'no_show':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'booked':
        return 'Booked';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      case 'rescheduled':
        return 'Rescheduled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const getConsultationTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      general: 'General Consultation',
      acne: 'Acne Treatment',
      anti_aging: 'Anti-Aging',
      pigmentation: 'Pigmentation',
      hair_loss: 'Hair Loss',
      other: 'Other Concern'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleJoinConsultation = (consultation: Consultation) => {
    if (consultation.meeting_link) {
      window.open(consultation.meeting_link, '_blank');
    }
  };

  const handleReschedule = (consultation: Consultation) => {
    // This would typically open a rescheduling modal
    console.log('Reschedule consultation:', consultation.id);
  };

  const handleCancel = (consultation: Consultation) => {
    // This would typically open a cancellation confirmation modal
    console.log('Cancel consultation:', consultation.id);
  };

  const handleRateConsultation = (consultation: Consultation) => {
    // This would typically open a rating modal
    console.log('Rate consultation:', consultation.id);
  };

  const isUpcoming = (consultation: Consultation) => {
    return ['booked', 'confirmed', 'in_progress'].includes(consultation.status) &&
           new Date(consultation.scheduled_date) > new Date();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-red-600 text-lg">!</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Unable to load consultation history</p>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            onClick={fetchConsultations}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Consultation History</h3>
        {onBookNewConsultation && (
          <button
            onClick={onBookNewConsultation}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            Book New Consultation
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="rating">Sort by Rating</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {consultations.length} consultation{consultations.length !== 1 ? 's' : ''} found
        </p>
        <button
          onClick={fetchConsultations}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Consultation List */}
      <div className="space-y-4">
        {consultations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-1">No consultations found</p>
            <p className="text-sm text-gray-500 mb-4">Book your first consultation to get started</p>
            {onBookNewConsultation && (
              <button
                onClick={onBookNewConsultation}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                Book Consultation
              </button>
            )}
          </div>
        ) : (
          consultations.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Doctor Info */}
                  <div className="flex-shrink-0">
                    {consultation.doctor?.profile_image_url ? (
                      <img
                        src={consultation.doctor.profile_image_url}
                        alt={consultation.doctor.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        Dr. {consultation.doctor?.full_name || 'Unknown'}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(consultation.status)}`}>
                        {getStatusIcon(consultation.status)}
                        {getStatusLabel(consultation.status)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {consultation.doctor?.specialization || 'Specialist'} - {getConsultationTypeLabel(consultation.consultation_type)}
                    </p>

                    {/* Consultation Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(consultation.scheduled_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(consultation.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span>{consultation.session_type === 'video' ? 'Video' : consultation.session_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{consultation.duration} min</span>
                      </div>
                    </div>

                    {/* Chief Complaint */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Chief Complaint:</span> {consultation.chief_complaint}
                      </p>
                    </div>

                    {/* Skin Concerns */}
                    {consultation.skin_concerns && consultation.skin_concerns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {consultation.skin_concerns.slice(0, 3).map((concern, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                          >
                            {concern}
                          </span>
                        ))}
                        {consultation.skin_concerns.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            +{consultation.skin_concerns.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Payment Status */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className={`font-medium ${
                        consultation.payment_status === 'paid' ? 'text-green-600' :
                        consultation.payment_status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {consultation.payment_status === 'paid' ? 'Paid' :
                         consultation.payment_status === 'pending' ? 'Payment Pending' :
                         consultation.payment_status}
                      </span>
                      <span>Fee: ${consultation.consultation_fee}</span>
                    </div>

                    {/* Post-consultation info */}
                    {consultation.status === 'completed' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {consultation.patient_rating && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= consultation.patient_rating!
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              Your rating
                            </span>
                          </div>
                        )}

                        {consultation.diagnosis && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-gray-700">Diagnosis:</p>
                            <p className="text-sm text-gray-600">{consultation.diagnosis}</p>
                          </div>
                        )}

                        {consultation.follow_up_required && consultation.follow_up_date && (
                          <div className="text-sm text-blue-600">
                            Follow-up scheduled: {new Date(consultation.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {isUpcoming(consultation) && (
                    <>
                      {consultation.status === 'confirmed' && (
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                        >
                          Join Call
                        </button>
                      )}
                      <button
                        onClick={() => handleReschedule(consultation)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(consultation)}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {consultation.status === 'completed' && !consultation.patient_rating && (
                    <button
                      onClick={() => handleRateConsultation(consultation)}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                    >
                      Rate Consultation
                    </button>
                  )}

                  {consultation.doctor_notes && (
                    <button
                      onClick={() => onConsultationSelect?.(consultation)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Notes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsultationHistory;
