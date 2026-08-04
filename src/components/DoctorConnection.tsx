import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  MessageCircle, 
  User, 
  Star,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Heart,
  Activity
} from 'lucide-react';

interface DoctorConnectionProps {
  userId?: string;
  onScheduleConsultation?: () => void;
  onStartVideoCall?: () => void;
  onMessageDoctor?: () => void;
}

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  availability: 'available' | 'busy' | 'offline';
  consultation_fee: number;
  image_url?: string;
  next_available?: string;
}

interface ConsultationEvent {
  id: string;
  doctor_id: string;
  user_id: string;
  type: 'video' | 'chat' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduled_time: string;
  duration_minutes: number;
  notes?: string;
  doctor?: DoctorProfile;
}

const DoctorConnection: React.FC<DoctorConnectionProps> = ({
  userId,
  onScheduleConsultation,
  onStartVideoCall,
  onMessageDoctor
}) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState<ConsultationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);

  // Fetch available doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch real doctors from profiles table where role = 'doctor'
        const { data: doctorProfiles, error: doctorError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            specialization,
            average_rating,
            experience_years,
            consultation_fee,
            profile_image_url,
            availability_status,
            next_available_time
          `)
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('average_rating', { ascending: false });

        if (doctorError) {
          console.error('Error fetching doctor profiles:', doctorError);
          throw doctorError;
        }

        // Transform profiles data to DoctorProfile format
        const transformedDoctors: DoctorProfile[] = (doctorProfiles || []).map(profile => ({
          id: profile.id,
          name: profile.full_name || 'Unknown Doctor',
          specialty: profile.specialization || 'General Dermatology',
          rating: profile.average_rating || 4.5,
          experience: profile.experience_years ? `${profile.experience_years}+ years` : 'Experienced',
          availability: profile.availability_status || 'available',
          consultation_fee: profile.consultation_fee || 150,
          image_url: profile.profile_image_url || '/api/placeholder/200/200',
          next_available: profile.next_available_time || 'Available today'
        }));

        setDoctors(transformedDoctors);

        // Fetch upcoming consultations
        const { data: consultations, error: consultError } = await supabase
          .from('doctor_consultations')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['scheduled', 'completed'])
          .order('scheduled_time', { ascending: true })
          .limit(5);

        if (consultError) {
          console.warn('Could not fetch consultations:', consultError);
        } else if (consultations) {
          setUpcomingConsultations(consultations);
        }

      } catch (err: any) {
        console.error('Error fetching doctor data:', err);
        setError(err.message || 'Failed to load doctor connections');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [userId]);

  const handleScheduleConsultation = useCallback((doctor: DoctorProfile) => {
    setSelectedDoctor(doctor);
    if (onScheduleConsultation) {
      onScheduleConsultation();
    }
  }, [onScheduleConsultation]);

  const handleStartVideoCall = useCallback((consultation: ConsultationEvent) => {
    if (onStartVideoCall) {
      onStartVideoCall();
    }
  }, [onStartVideoCall]);

  const handleMessageDoctor = useCallback((doctor: DoctorProfile) => {
    setSelectedDoctor(doctor);
    if (onMessageDoctor) {
      onMessageDoctor();
    }
  }, [onMessageDoctor]);

  const getAvailabilityColor = (availability: DoctorProfile['availability']) => {
    switch (availability) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityText = (availability: DoctorProfile['availability']) => {
    switch (availability) {
      case 'available': return 'Available Now';
      case 'busy': return 'In Consultation';
      case 'offline': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading doctor connections...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">Unable to load doctors</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Consultations */}
      {upcomingConsultations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Consultations
          </h3>
          <div className="space-y-3">
            {upcomingConsultations.map((consultation) => (
              <div key={consultation.id} className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{consultation.doctor?.name || 'Doctor'}</div>
                    <div className="text-sm opacity-75">{consultation.doctor?.specialty}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {new Date(consultation.scheduled_time).toLocaleDateString()}
                    </div>
                    <div className="text-xs opacity-75">
                      {new Date(consultation.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    consultation.status === 'scheduled' ? 'bg-white/20' : 'bg-green-500/20'
                  }`}>
                    {consultation.status === 'scheduled' ? 'Scheduled' : 'Completed'}
                  </span>
                  {consultation.type === 'video' && <Video className="w-4 h-4" />}
                  {consultation.type === 'chat' && <MessageCircle className="w-4 h-4" />}
                  {consultation.status === 'scheduled' && (
                    <button
                      onClick={() => handleStartVideoCall(consultation)}
                      className="ml-auto px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-medium hover:bg-white/90 transition-colors"
                    >
                      Join Call
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Doctors */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Available Dermatologists
        </h3>
        <div className="grid gap-4">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                {/* Doctor Image */}
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                
                {/* Doctor Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                      <p className="text-sm text-gray-600">{doctor.specialty}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{doctor.rating}</span>
                      </div>
                      <div className="text-xs text-gray-500">{doctor.experience}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(doctor.availability)}`}>
                      {getAvailabilityText(doctor.availability)}
                    </span>
                    <span className="text-xs text-gray-500">${doctor.consultation_fee}/session</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    Next available: {doctor.next_available}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScheduleConsultation(doctor)}
                      disabled={doctor.availability === 'offline'}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => handleMessageDoctor(doctor)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-sm">Emergency Consult</div>
        </button>
        <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Heart className="w-5 h-5" />
          </div>
          <div className="text-sm">Skin Health Check</div>
        </button>
      </div>
    </div>
  );
};

export default DoctorConnection;
