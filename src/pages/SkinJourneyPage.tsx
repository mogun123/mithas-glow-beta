import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, TrendingUp, Award, Users, BookOpen, Sparkles, Target, ChevronRight } from 'lucide-react';

// Import components
import SkinProgressGraph from '../components/SkinProgressGraph';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import DoctorList from '../components/DoctorList';
import BookConsultation from '../components/BookConsultation';
import ConsultationHistory from '../components/ConsultationHistory';

// Import engines
import { aiRoutineEngine } from '../features/skinRoutine/aiRoutineEngine';
import { glowGameEngine } from '../features/gamification/glowGameEngine';

interface SkinJourneyPageProps {
  userId?: string;
}

const SkinJourneyPage: React.FC<SkinJourneyPageProps> = ({ userId: propUserId }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<any>(null);
  const [gamificationProfile, setGamificationProfile] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'routine' | 'doctors'>('overview');
  
  // Doctor modal states
  const [showDoctorList, setShowDoctorList] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Get current user if not provided
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
          } else {
            navigate('/login');
            return;
          }
        }

        if (userId) {
          await loadJourneyData();
          await loadGamificationData();
        }
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [userId, navigate]);

  const loadJourneyData = async () => {
    if (!userId) return;

    try {
      // Get active journey
      const { data: journeyData } = await supabase
        .rpc('get_active_glow_journey', { p_user_id: userId });

      if (journeyData && journeyData.length > 0) {
        setJourney(journeyData[0]);
      }
    } catch (error) {
      console.error('Error loading journey data:', error);
    }
  };

  const loadGamificationData = async () => {
    if (!userId) return;

    try {
      const profile = await glowGameEngine.getUserGamificationProfile(userId);
      setGamificationProfile(profile);
      
      const userInsights = await glowGameEngine.getUserInsights(userId);
      setInsights(userInsights);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };

  const handleDoctorSelect = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowDoctorList(false);
    setShowBookingModal(true);
  };

  const handleBookingConfirmed = (consultation: any) => {
    setShowBookingModal(false);
    setSelectedDoctor(null);
    // Refresh data
    loadJourneyData();
  };

  const handleBookNewConsultation = () => {
    setShowDoctorList(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your skin journey...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login to view your skin journey</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Skin Journey</h1>
                <p className="text-sm text-gray-600">
                  {journey ? `Day ${Math.floor((new Date().getTime() - new Date(journey.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} of 30` : 'Start your journey'}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            {gamificationProfile && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{gamificationProfile.current_streak}</div>
                  <div className="text-xs text-gray-500">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{gamificationProfile.total_xp}</div>
                  <div className="text-xs text-gray-500">Total XP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{gamificationProfile.glow_points}</div>
                  <div className="text-xs text-gray-500">Glow Points</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Sparkles },
              { id: 'progress', label: 'Progress', icon: TrendingUp },
              { id: 'routine', label: 'AI Routine', icon: Target },
              { id: 'doctors', label: 'Doctors', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Journey Status Card */}
            {journey ? (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Journey Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-700">Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.floor((new Date().getTime() - new Date(journey.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} / 30 days
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${((Math.floor((new Date().getTime() - new Date(journey.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-700">Total Scans</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{journey.total_scans}</div>
                    <div className="text-sm text-gray-500">Completed analyses</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-700">Achievements</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{gamificationProfile?.achievements.length || 0}</div>
                    <div className="text-sm text-gray-500">Badges earned</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Start Your Skin Journey</h2>
                <p className="text-gray-600 mb-6">Begin your 30-day transformation with AI-powered skin analysis</p>
                <button
                  onClick={() => navigate('/scanner')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Your Journey
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'New Scan', desc: 'Track your progress', icon: 'camera', action: () => navigate('/scanner') },
                { title: 'View Progress', desc: 'See your improvements', icon: 'trending', action: () => setActiveTab('progress') },
                { title: 'AI Routine', desc: 'Get personalized care', icon: 'sparkles', action: () => setActiveTab('routine') },
                { title: 'Book Doctor', desc: 'Expert consultation', icon: 'users', action: () => setActiveTab('doctors') }
              ].map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-purple-600 text-lg">
                      {action.icon === 'camera' ? 'camera' : action.icon === 'trending' ? 'trending' : action.icon === 'sparkles' ? 'sparkles' : 'users'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.desc}</p>
                </button>
              ))}
            </div>

            {/* Recent Achievements */}
            {gamificationProfile?.achievements && gamificationProfile.achievements.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Achievements</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gamificationProfile.achievements.slice(0, 4).map((achievement: any) => (
                    <div key={achievement.id} className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Award className="w-8 h-8 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{achievement.name}</h4>
                      <p className="text-xs text-gray-500">{new Date(achievement.earned_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            {journey ? (
              <>
                <SkinProgressGraph journeyId={journey.id} showDetails={true} />
                <BeforeAfterComparison journeyId={journey.id} showDetails={true} />
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Progress Data Yet</h2>
                <p className="text-gray-600 mb-6">Complete your first scan to start tracking your progress</p>
                <button
                  onClick={() => navigate('/scanner')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Scanning
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Routine Tab */}
        {activeTab === 'routine' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">AI-Generated Skin Routine</h2>
              <p className="text-gray-600 mb-6">
                Based on your latest skin analysis, here's your personalized routine
              </p>
              
              {/* This would integrate with the AI Routine Engine */}
              <div className="space-y-4">
                <div className="border-l-4 border-purple-600 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Morning Routine</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>1. Gentle Cleanser - Remove overnight impurities</div>
                    <div>2. Vitamin C Serum - Brighten and protect</div>
                    <div>3. Moisturizer with SPF - Hydrate and shield from UV</div>
                  </div>
                </div>
                
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Evening Routine</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>1. Double Cleanse - Thoroughly remove makeup and pollutants</div>
                    <div>2. Treatment Serum - Target specific concerns</div>
                    <div>3. Night Cream - Repair and rejuvenate while you sleep</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>AI Recommendation:</strong> Your routine focuses on hydration and barrier repair. 
                  Consistency is key - follow this routine for at least 4 weeks to see optimal results.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Doctor Consultations</h2>
                <button
                  onClick={handleBookNewConsultation}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Book Consultation
                </button>
              </div>
              
              <ConsultationHistory 
                userId={userId!} 
                onBookNewConsultation={handleBookNewConsultation}
                maxResults={5}
              />
            </div>

            {showDoctorList && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Find a Doctor</h2>
                <DoctorList 
                  onDoctorSelect={handleDoctorSelect}
                  maxResults={10}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
        <BookConsultation
          doctor={selectedDoctor}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
          onBookingConfirmed={handleBookingConfirmed}
          userId={userId!}
          journeyId={journey?.id}
        />
      )}
    </div>
  );
};

export default SkinJourneyPage;
