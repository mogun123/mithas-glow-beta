import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Mail, MapPin, User, Edit, Settings, ChevronRight, Handshake,
  Target, Zap, Eye, Crown, Share2, Calendar, Lock,
  TrendingUp, PlayCircle, BookA, Send, Repeat2, CheckCircle,
  Shield, AlertTriangle, Gift, QrCode, Clipboard,
  Volume2, GalleryVertical, Tag, Wifi, Fingerprint, RefreshCcw, ThumbsUp, Lightbulb, Link, MessageCircle, Key, ArrowLeft, Home,
  Bell, Download, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../lib/store";
import { useGlobalStore } from '../lib/globalStore';
import { supabase } from '../lib/supabase';
const EMPTY_PROFILE = {
  name: "loading",
  email: "",
  dob: "",
  city: "",
  username: "loading",
  language: "English",
  memberSince: "2026-01-01",
  profileCompleted: false,
  coverUrl: "linear-gradient(to right, #a855f7, #ec4899)",
  photoUrl: "",
  stats: { followers: '0', following: '0', viewsThisWeek: '0', profileViews: '0' },
  missions: [],
  aiHistory: [],
  settings: { is2FAEnabled: false, isProfilePrivate: false }
};



// --- Configuration and Mock Data ---

const GLOW_ACCENT = 'rgba(219, 39, 119, 1)'; // Pink-600 for Mithas Glow
const CONVERSION_RATE = 0.05;

const initialProfileData = {
  name: 'Alex "The Glimmer" Johnson',
  username: '@alexj_glow',
  isVerified: true,
  isPro: true, 
  ndaAccepted: true, 
  badge: 'Diamond',
  status: 'Active Now',
  title: 'Certified Glow Artist',
  bio: 'Mastering the art of digital beauty and trend forecasting. Bookings open for virtual consultations and collaborations!',
  voiceIntroUrl: 'alex-intro-001.mp3',
  location: 'Los Angeles, CA',
  memberSince: '2024-03-10', 
  website: 'https://www.alexjglow.com', 
  pronouns: 'They/Them', 
  photoUrl: 'https://placehold.co/100x100/db2777/ffffff?text=A',
  coverUrl: 'linear-gradient(to right, #a855f7, #ec4899)', // Purple to Pink gradient
  stats: { 
    followers: '4.5K', 
    following: '120', 
    viewsThisWeek: '18,500', 
    profileViews: '2.3K' 
  },
  missions: [
    { id: 1, text: 'Upload 3 new Reels this week', points: 200, completed: true },
    { id: 2, text: 'Complete 5 Try-On Mirrors', points: 500, completed: false },
  ],
  settings: {
      is2FAEnabled: true, 
      theme: 'Dynamic Mood', 
      font: 'Inter',
      language: 'English (US)',
      isProfilePrivate: false,
  },
  aiHistory: [
    { trend: 'Monochromatic Coral Look', date: '2025-10-14' },
    { trend: 'Sustainable Packaging Review', date: '2025-10-10' },
    { trend: 'Latex Finish Lip Gloss', date: '2025-10-06' },
  ]
};

// --- Utility Components ---

const ModalWrapper = ({ title, onClose, children }: { 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode 
}) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex justify-center items-center p-4">
        <div className="bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300 p-6 flex flex-col max-h-[95vh]">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-3xl text-white mb-4 border-b border-gray-700 pb-3 flex-shrink-0">{title}</h2>
            <div className="overflow-y-auto flex-grow pr-2">
                {children}
            </div>
        </div>
    </div>
);

const StatCard = React.memo(({ label, value, icon: Icon }: { 
  label: string; 
  value: string; 
  icon: React.ElementType 
}) => (
  <div className="flex flex-col items-center p-3 bg-gray-700/50 rounded-xl transition duration-200 hover:bg-gray-700">
    <Icon size={20} className="text-gray-300 mb-1" />
    <div className="text-lg text-white">{value}</div>
    <div className="text-xs uppercase tracking-wider text-gray-400 mt-1">{label}</div>
  </div>
));

const BadgeIcon = ({ level }: { level: string }) => {
  const colors: Record<string, string> = { 
    Diamond: 'text-cyan-400', 
    Gold: 'text-yellow-400', 
    Silver: 'text-gray-400',
    Bronze: 'text-amber-600'
  };
  return <Crown size={18} className={`inline ml-2 ${colors[level] || 'text-gray-500'}`} />;
};

// --- Feature 1: AI Glow Score Gauge (SVG) ---
const GlowScoreGauge = ({ score }: { score: number }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64" preserveAspectRatio="none">
                <circle
                    cx="32" cy="32" r={radius}
                    fill="#4B5563"
                    stroke="none"
                    strokeWidth="4"
                />
                <circle
                    cx="32" cy="32" r={radius}
                    fill="transparent"
                    stroke={GLOW_ACCENT}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-xl text-white">{Math.round(score)}</p>
                <p className="text-xs text-gray-400">Score</p>
            </div>
        </div>
    );
};

// --- Modals ---

const MockModal = ({ title, onClose, children }: { 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode 
}) => (
    <ModalWrapper title={title} onClose={onClose}>
        <div className="p-6 bg-gray-700 rounded-xl space-y-4 shadow-inner">
            <div className="flex items-center text-yellow-300 bg-gray-600/50 p-3 rounded-lg">
                <Lightbulb size={20} className="mr-2"/>
                <p className="text-sm">This is a Phase 2 feature placeholder.</p>
            </div>
            {children}
        </div>
    </ModalWrapper>
);

const SettingsModal = ({ profile, setProfile, onClose }: { 
  profile: any; 
  setProfile: (fn: (prev: any) => any) => void; 
  onClose: () => void 
}) => {
    const [activeView, setActiveView] = useState('general');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [messageNotifications, setMessageNotifications] = useState(true);

    const handleTogglePrivate = () => {
        setProfile((prev: any) => ({
            ...prev,
            settings: {
                ...prev.settings,
                isProfilePrivate: !prev.settings.isProfilePrivate,
            }
        }));
    };

    const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-pink-600' : 'bg-gray-600'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );

    const renderGeneralView = () => (
        <div className="space-y-6">
            <h3 className="text-xl text-white">Security & General Settings</h3>
            
            {/* Account Security Section */}
            <div className="bg-gray-700 p-4 rounded-xl space-y-4">
                <h4 className="text-white flex items-center border-b border-gray-600 pb-2">
                    <Shield size={18} className="mr-2 text-red-400" />
                    Account Security
                </h4>
                
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Key size={16} className="mr-3 text-red-400" />
                        <div>
                            <p className="text-white text-sm">Two-Factor Authentication</p>
                            <p className="text-xs text-gray-400">Protect your account with 2FA</p>
                        </div>
                    </div>
                    <span className="text-green-400 text-sm">Enabled</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <Lock size={16} className="mr-3 text-yellow-400" />
                        <div>
                            <p className="text-white text-sm">Change Password</p>
                            <p className="text-xs text-gray-400">Update your login password</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Password change coming soon!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        Update
                    </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <Fingerprint size={16} className="mr-3 text-purple-400" />
                        <div>
                            <p className="text-white text-sm">Biometric Login</p>
                            <p className="text-xs text-gray-400">Face ID / Fingerprint</p>
                        </div>
                    </div>
                    <ToggleSwitch 
                        enabled={profile.settings.is2FAEnabled} 
                        onToggle={() => {
                            setProfile((prev: any) => ({
                                ...prev,
                                settings: { ...prev.settings, is2FAEnabled: !prev.settings.is2FAEnabled }
                            }));
                            toast.success('Biometric login updated');
                        }} 
                    />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <User size={16} className="mr-3 text-blue-400" />
                        <div>
                            <p className="text-white text-sm">Login Activity</p>
                            <p className="text-xs text-gray-400">View recent login sessions</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Login activity tracking coming soon!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        View
                    </button>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-gray-700 p-4 rounded-xl space-y-4">
                <h4 className="text-white flex items-center border-b border-gray-600 pb-2">
                    <Bell size={18} className="mr-2 text-yellow-400" />
                    Notification Preferences
                </h4>

                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-white text-sm">All Notifications</p>
                        <p className="text-xs text-gray-400">Master notification toggle</p>
                    </div>
                    <ToggleSwitch 
                        enabled={notificationsEnabled} 
                        onToggle={() => {
                            setNotificationsEnabled(!notificationsEnabled);
                            toast.success(notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled');
                        }} 
                    />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div>
                        <p className="text-white text-sm">Email Notifications</p>
                        <p className="text-xs text-gray-400">Receive updates via email</p>
                    </div>
                    <ToggleSwitch 
                        enabled={emailNotifications} 
                        onToggle={() => {
                            setEmailNotifications(!emailNotifications);
                            toast.success('Email preference updated');
                        }} 
                    />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div>
                        <p className="text-white text-sm">Push Notifications</p>
                        <p className="text-xs text-gray-400">Mobile app notifications</p>
                    </div>
                    <ToggleSwitch 
                        enabled={pushNotifications} 
                        onToggle={() => {
                            setPushNotifications(!pushNotifications);
                            toast.success('Push notifications updated');
                        }} 
                    />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div>
                        <p className="text-white text-sm">Message Notifications</p>
                        <p className="text-xs text-gray-400">Chat and DM alerts</p>
                    </div>
                    <ToggleSwitch 
                        enabled={messageNotifications} 
                        onToggle={() => {
                            setMessageNotifications(!messageNotifications);
                            toast.success('Message notifications updated');
                        }} 
                    />
                </div>
            </div>

            {/* Privacy & Data Section */}
            <div className="bg-gray-700 p-4 rounded-xl space-y-4">
                <h4 className="text-white flex items-center border-b border-gray-600 pb-2">
                    <Lock size={18} className="mr-2 text-green-400" />
                    Privacy & Data
                </h4>

                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Eye size={16} className="mr-3 text-purple-400" />
                        <div>
                            <p className="text-white text-sm">Profile Visibility</p>
                            <p className="text-xs text-gray-400">Who can view your profile</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Visibility settings coming soon!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        Public
                    </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <Shield size={16} className="mr-3 text-green-400" />
                        <div>
                            <p className="text-white text-sm">Blocked Users</p>
                            <p className="text-xs text-gray-400">Manage blocked accounts</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Blocked users list coming soon!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        Manage
                    </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <Download size={16} className="mr-3 text-blue-400" />
                        <div>
                            <p className="text-white text-sm">Download Your Data</p>
                            <p className="text-xs text-gray-400">Export all your information</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Data download initiated!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        Request
                    </button>
                </div>
            </div>

            {/* Language & Region */}
            <div className="bg-gray-700 p-4 rounded-xl space-y-4">
                <h4 className="text-white flex items-center border-b border-gray-600 pb-2">
                    <Globe size={18} className="mr-2 text-blue-400" />
                    Language & Region
                </h4>

                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <MessageCircle size={16} className="mr-3 text-purple-400" />
                        <div>
                            <p className="text-white text-sm">App Language</p>
                            <p className="text-xs text-gray-400">Choose your preferred language</p>
                        </div>
                    </div>
                    <select 
                        className="bg-gray-600 text-white text-sm px-3 py-1 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        defaultValue="en-US"
                        onChange={(e) => toast.success(`Language changed to ${e.target.value}`)}
                    >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    </select>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <div className="flex items-center">
                        <MapPin size={16} className="mr-3 text-green-400" />
                        <div>
                            <p className="text-white text-sm">Time Zone</p>
                            <p className="text-xs text-gray-400">IST (UTC +5:30)</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toast.info('Timezone settings coming soon!')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        Change
                    </button>
                </div>
            </div>

            {/* Legal & Support */}
            <div className="bg-gray-700 p-4 rounded-xl space-y-4">
                <h4 className="text-white flex items-center border-b border-gray-600 pb-2">
                    <Scale size={18} className="mr-2 text-gray-400" />
                    Legal & Support
                </h4>

                <button 
                    onClick={() => toast.info('Opening Terms of Service...')}
                    className="flex justify-between items-center w-full text-left"
                >
                    <p className="text-white text-sm">Terms of Service</p>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>

                <button 
                    onClick={() => toast.info('Opening Privacy Policy...')}
                    className="flex justify-between items-center w-full text-left pt-2 border-t border-gray-600"
                >
                    <p className="text-white text-sm">Privacy Policy</p>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>

                <button 
                    onClick={() => toast.info('Opening Help Center...')}
                    className="flex justify-between items-center w-full text-left pt-2 border-t border-gray-600"
                >
                    <p className="text-white text-sm">Help Center</p>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>

                <button 
                    onClick={() => toast.info('Contact support: support@mithasglow.com')}
                    className="flex justify-between items-center w-full text-left pt-2 border-t border-gray-600"
                >
                    <p className="text-white text-sm">Contact Support</p>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>
            </div>

            <button 
                onClick={() => setActiveView('advanced')} 
                className="w-full p-3 bg-pink-600 rounded-lg text-white mt-4 hover:bg-pink-700 transition flex items-center justify-center"
            >
                Go to Advanced Settings <ChevronRight size={18} className="inline ml-1 mb-[2px]" />
            </button>
        </div>
    );
    
    const renderAdvancedView = () => (
        <div className="space-y-6">
            <h3 className="text-xl text-white flex items-center">
                <ChevronRight size={20} className="mr-2 rotate-180 cursor-pointer text-gray-400 hover:text-white" onClick={() => setActiveView('general')} />
                Advanced Creator Controls
            </h3>
            
            <div className="space-y-4 bg-gray-700 p-4 rounded-xl border border-pink-500/50">
                <div className="flex justify-between items-center">
                    <div className='flex items-center'>
                        <Lock size={20} className="mr-3 text-pink-400" />
                        <div>
                            <p className="text-white">Private Profile Mode</p>
                            <p className="text-xs text-gray-400">Hides your portfolio from public view.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleTogglePrivate} 
                        className={`px-3 py-1 rounded-full text-sm transition ${profile.settings.isProfilePrivate ? 'bg-pink-600 hover:bg-pink-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                        {profile.settings.isProfilePrivate ? 'Deactivate' : 'Activate'}
                    </button>
                </div>

                <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                    <div className='flex items-center'>
                        <Volume2 size={20} className="mr-3 text-yellow-400" />
                        <div>
                            <p className="text-white">Audio Narration Settings</p>
                            <p className="text-xs text-gray-400">Choose voice tone for your intro.</p>
                        </div>
                    </div>
                    <button className='text-sm text-yellow-400 hover:text-yellow-300'>Manage</button>
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                    <div className='flex items-center'>
                        <QrCode size={20} className="mr-3 text-purple-400" />
                        <div>
                            <p className="text-white">Dynamic QR Code</p>
                            <p className="text-xs text-gray-400">Generate a scannable link to your page.</p>
                        </div>
                    </div>
                    <button className='text-sm text-purple-400 hover:text-purple-300'>Generate</button>
                </div>

            </div>

            <button 
                onClick={() => setActiveView('general')} 
                className="w-full p-3 bg-gray-700 rounded-lg text-white mt-4 hover:bg-gray-600 transition"
            >
                &larr; Back to General Settings
            </button>
        </div>
    );

    return (
        <ModalWrapper 
            title={activeView === 'general' ? "App Settings" : "Advanced Settings"} 
            onClose={onClose}
        >
            {activeView === 'general' ? renderGeneralView() : renderAdvancedView()}
        </ModalWrapper>
    );
};

const ShareModal = ({ profile, onClose }: { profile: any; onClose: () => void }) => {
  const handleCopy = () => {
    const link = `glow.io/p/${(profile?.username?.startsWith?.('@') ? profile.username.substring(1) : (profile?.username || 'user'))}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  return (
    <MockModal title="Share Profile" onClose={onClose}>
        <h3 className="text-xl text-white">Share Your Glow Link</h3>
        <p className="text-gray-300">Share your custom link to showcase your profile and portfolio.</p>
        <label className="block mt-2">
          <span className="text-gray-400 text-sm">Direct URL:</span>
          <input 
            readOnly 
            value={`glow.io/p/${(profile?.username?.startsWith?.('@') ? profile.username.substring(1) : (profile?.username || 'user'))}`} 
            className="w-full p-3 mt-1 bg-gray-600 rounded-lg text-gray-200 border-none"
          />
        </label>
        <button 
          className="w-full p-3 bg-pink-600 rounded-lg text-white mt-4 hover:bg-pink-700 transition"
          onClick={handleCopy}
        >
            <Clipboard size={18} className="inline mr-2"/> Copy Link
        </button>
    </MockModal>
  );
};

const EditProfileModal = ({ profile, setProfile, onClose }: { 
  profile: any; 
  setProfile: (fn: (prev: any) => any) => void; 
  onClose: () => void 
}) => {
  const [name, setName] = useState(profile.name || "");
  const [username, setUsername] = useState((profile?.username?.startsWith?.('@') ? profile.username.substring(1) : (profile?.username || 'user')));
  const [bio, setBio] = useState(profile.bio || "");
  const [location, setLocation] = useState(profile.location || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [pronouns, setPronouns] = useState(profile.pronouns || "");
  const [photoPreview, setPhotoPreview] = useState(profile.photoUrl || null);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl || "");

  const handleSave = () => {
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    
    setProfile((prev: any) => ({
      ...prev,
      name,
      bio,
      location,
      website,
      pronouns,
      username: `@${sanitizedUsername}`,
      photoUrl: photoPreview,
      coverUrl, 
    }));
    toast.success('Profile updated successfully!');
    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <ModalWrapper title="Edit Profile Details" onClose={onClose}>
      <div className="space-y-6">
        
        <div className="flex items-center space-x-4 border-b border-gray-700 pb-4">
          <div className="relative">
            <img
              src={photoPreview || "https://placehold.co/100x100/db2777/ffffff?text=Profile"}
              alt="Profile"
              className="w-20 h-20 rounded-full border-2 border-pink-400/50 object-cover"
            />
            <label className="absolute bottom-0 right-0 bg-pink-500 text-white p-1 rounded-full cursor-pointer hover:bg-pink-600 transition">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <Edit size={14} />
            </label>
          </div>
          <div>
            <h4 className="text-lg text-white">Profile Picture</h4>
            <p className="text-sm text-gray-400">Tap edit icon to upload a new photo.</p>
          </div>
        </div>
        
        <label className="block">
          <span className="text-gray-400 flex items-center"><GalleryVertical size={16} className="mr-2"/> Profile Banner (URL/Gradient CSS)</span>
          <input
            type="text"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="e.g., https://img.png or linear-gradient(...)"
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          />
        </label>

        <label className="block">
          <span className="text-gray-400">Display Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          />
        </label>

        <label className="block">
          <span className="text-gray-400">Username (@ handle)</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 pl-6 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
              maxLength={30}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-gray-400">Pronouns</span>
          <select
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="">Select pronouns</option>
            <option value="She/Her">She/Her</option>
            <option value="He/Him">He/Him</option>
            <option value="They/Them">They/Them</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="text-gray-400 flex justify-between">
            Bio / Tagline
            <span className="text-xs text-gray-500">{160 - bio.length} chars left</span>
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          />
        </label>

        <label className="block">
          <span className="text-gray-400">Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          />
        </label>

        <label className="block">
          <span className="text-gray-400">Website / Social Link</span>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full p-3 mt-1 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-pink-500 focus:border-pink-500"
          />
        </label>

        <button
          onClick={handleSave}
          className="w-full p-3 mt-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition"
        >
          Save Profile
        </button>
      </div>
    </ModalWrapper>
  );
};

const BookingsModal = ({ onClose }: { onClose: () => void }) => {
    const mockBookings = [
        { id: 1, type: 'Virtual Consult', date: 'Fri, Nov 15th @ 2 PM', client: 'Seraphina M.', status: 'Upcoming', fee: 150 },
        { id: 2, type: 'Brand Campaign Shoot', date: 'Thu, Oct 24th @ 9 AM', client: 'Aura Skincare', status: 'Pending', fee: 800 },
        { id: 3, type: 'One-on-One Class', date: 'Mon, Oct 7th', client: 'Liam P.', status: 'Completed', fee: 100 },
    ];

    const totalUpcomingFee = mockBookings.filter(b => b.status === 'Upcoming' || b.status === 'Pending').reduce((sum, b) => sum + b.fee, 0);

    return (
        <ModalWrapper title="Creator Booking Dashboard" onClose={onClose}>
            <div className="space-y-6">
                <div className="p-4 bg-green-900/40 border border-green-700 rounded-xl text-center">
                    <p className="text-sm uppercase text-green-300">Upcoming Revenue Potential</p>
                    <h4 className="text-3xl text-white mt-1">
                        ₹{totalUpcomingFee.toLocaleString()}
                    </h4>
                </div>

                <h3 className="text-xl text-white flex items-center border-b border-gray-700 pb-2"><Calendar size={20} className="mr-2 text-purple-400" /> Appointments ({mockBookings.length})</h3>
                
                <div className="space-y-3">
                    {mockBookings.map(booking => (
                        <div key={booking.id} className="p-4 bg-gray-700/50 rounded-lg flex justify-between items-center transition duration-150 hover:bg-gray-700">
                            <div>
                                <p className="text-white flex items-center">
                                    {booking.type} 
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                        booking.status === 'Upcoming' ? 'bg-purple-600' : 
                                        booking.status === 'Pending' ? 'bg-yellow-600' : 'bg-gray-600'
                                    }`}>{booking.status}</span>
                                </p>
                                <p className="text-sm text-gray-400 mt-1">{booking.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-green-400">₹{booking.fee}</p>
                                <p className="text-xs text-gray-500">Client: {booking.client}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="w-full text-sm mt-4 p-3 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition">
                    Open Availability Calendar
                </button>
            </div>
        </ModalWrapper>
    );
};

// --- Main Component ---

interface ProfileScreenProps {
  onNavigateHome: () => void;
}

export function ProfileScreen({ onNavigateHome }: ProfileScreenProps) {
  // Use global store for real-time data
  const { user: globalUser, isProUser, fetchUserProfile } = useGlobalStore();
  const storeProfile = useAuthStore((state) => state.user || (state as any).profile);
  
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Fetch user data on mount
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await fetchUserProfile(authUser.id);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    initializeProfile();
  }, [fetchUserProfile]);

useEffect(() => {
  // Use global user data if available, fallback to store profile
  const userData = globalUser || storeProfile;
  
  if (userData) {
    setProfile((prev: any) => ({
      ...prev,
      ...userData,

      // Mapping: Design name = Database name
      name: userData.full_name || userData.display_name || userData.name || prev.name,
      username: userData.username || prev.username,
      bio: userData.bio || prev.bio,
      location: userData.city || userData.location || prev.location || "Earth",
      photoUrl: userData.avatar_url || userData.photoUrl || prev.photoUrl || "",

      // Role-based data
      user_type: userData.user_type || 'normal',

      stats: {
        followers: userData.followers_count || '0',
        following: userData.following_count || '0',
        viewsThisWeek: '0',
        profileViews: '0'
      }
    }));
  }
}, [globalUser, storeProfile]);
  
  useEffect(() => {
      const setOnlineHandler = () => setIsOnline(true);
      const setOfflineHandler = () => setIsOnline(false);
      window.addEventListener('online', setOnlineHandler);
      window.addEventListener('offline', setOfflineHandler);
      return () => {
          window.removeEventListener('online', setOnlineHandler);
          window.removeEventListener('offline', setOfflineHandler);
      };
  }, []);

  const { badgeLevel, glowRank, glowScore } = useMemo(() => {
    const pts = 0; // Wallet points removed for MITHAS SKIN AI V1
    const badge = (() => {
        if (pts >= 5000) return 'Diamond';
        if (pts >= 2500) return 'Gold';
        if (pts >= 1000) return 'Silver';
        return 'Bronze';
    })();

    const baseRank = 5000;
    const rankValue = pts > 0 ? Math.floor(baseRank / (pts / 50)) : baseRank;
    const calculatedRank = Math.min(rankValue, baseRank);
    const score = Math.min((pts / 5000) * 100, 100);

    return { badgeLevel: badge, glowRank: calculatedRank, glowScore: score };
  }, []);

  const handleRefreshTrends = () => {
      const newTrend = `AI Suggested Trend ${Date.now().toString().slice(-4)}`;
      const newDate = new Date().toISOString().slice(0, 10);
      
      setProfile((prev: any) => {
          const newHistory = [{ trend: newTrend, date: newDate }, ...prev.aiHistory].slice(0, 3);
          return {
              ...prev,
              aiHistory: newHistory,
          };
      });
      toast.success(`Refreshed! New Trend: "${newTrend}"`);
  };
  
  const renderFeedContent = ({ isLocked }: { isLocked: boolean }) => {
    if (isLocked) {
        return (
            <div className="text-center p-10 bg-gray-700/50 rounded-xl my-8">
                <Lock size={32} className="mx-auto text-pink-400 mb-3" />
                <p className="text-lg text-white">Profile Portfolio Locked</p>
                <p className="text-gray-400 text-sm">Portfolio content is hidden due to privacy settings (is_private flag active).</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="bg-gray-700/50 p-3 rounded-xl border border-gray-600">
              <p className="text-sm text-pink-400">Top Fan Comment Highlight (AI Sentiment)</p>
              <blockquote className="text-gray-300 text-base italic mt-1 border-l-2 border-pink-500 pl-3">
                "Alex's glow tips changed my entire makeup routine, everything just clicks now! 💖"
              </blockquote>
            </div>

            <div className="grid grid-cols-3 gap-[1px] sm:gap-2">
              {Array(9).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:opacity-80 transition duration-150 cursor-pointer">
                  Reel {i + 1}
                </div>
              ))}
            </div>

             <div className="mt-8 pt-4 border-t border-gray-700 space-y-4">
                <h3 className="text-xl text-white">Additional Quick Links</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center justify-center p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition">
                        <GalleryVertical size={24} className="text-purple-400" />
                        <span className="mt-2 text-sm">Try-On Mirror History</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition">
                        <Tag size={24} className="text-yellow-400" />
                        <span className="mt-2 text-sm">Tagged Posts</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition">
                        <TrendingUp size={24} className="text-pink-400" />
                        <span className="mt-2 text-sm">Analytics Dashboard</span>
                    </button>
                 </div>
             </div>
        </div>
    );
  };

  const glowStyle = {
    '--glow-color': GLOW_ACCENT,
    '--glow-shadow': `${GLOW_ACCENT}33`,
  } as React.CSSProperties;
  
  // 📍 
const coverStyle = {
  backgroundImage: (profile?.coverUrl && typeof profile.coverUrl === 'string' && profile.coverUrl.startsWith('http'))
    ? `url(${profile.coverUrl})` 
    : (profile?.coverUrl || 'linear-gradient(to right, #a855f7, #ec4899)'),
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  height: '150px',
};


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 pb-8 font-sans" style={glowStyle}>
      <style>{`
        .glow-button {
          background-color: var(--glow-color);
          box-shadow: 0 4px 15px var(--glow-shadow);
        }
        .glow-button:hover {
          filter: brightness(1.1);
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto">
        
        {!isOnline && (
            <div className="fixed top-0 left-0 right-0 z-50 p-2 bg-yellow-600/90 text-center text-sm text-white flex items-center justify-center shadow-lg">
                <Wifi size={16} className="mr-2 animate-pulse" />
                You're in Offline Mode (Local Cache Active)
            </div>
        )}

        <header className={`flex justify-between items-center mb-4 sticky top-0 bg-gray-900 z-20 p-3 border-b border-gray-800 lg:hidden -mx-4 sm:mx-0 ${!isOnline ? 'mt-8' : ''}`}>
            <div className="flex items-center space-x-3">
              <button 
                onClick={onNavigateHome} 
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
                title="Back to Home"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl text-white">MITHAS Glow</h1>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => setShowModal('bookings')} 
                    className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white"
                >
                    <BookA size={18}/>
                </button>
                <button 
                    onClick={() => setShowModal('settings')} 
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
                >
                    <Settings size={18}/>
                </button>
            </div>
        </header>

        <header className="hidden lg:flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onNavigateHome}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition transform hover:scale-105"
              title="Back to Home"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-3xl tracking-tight text-white">
              MITHAS Glow Creator Hub
            </h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowModal('bookings')} 
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-full shadow-lg transition transform hover:scale-105"
            >
              <BookA size={16} />
              <span className="hidden sm:inline">Bookings</span>
            </button>
            <button
              onClick={() => setShowModal('settings')}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition transform hover:scale-105"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
                <div 
                    className="relative w-full h-32 lg:h-40 bg-gray-700/50 animate-pulse-slow" 
                    style={coverStyle}
                >
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                <div className="p-6 pt-0 relative">
                    <div className="absolute -top-12 left-6 w-24 h-24"> 
                        
<img
    src={profile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=db2777&color=fff`}
    alt="Profile Avatar"
    className="w-full h-full rounded-full object-cover border-4 border-gray-800 ring-4 ring-pink-400/50"
/>

                        {profile.isVerified && <CheckCircle size={20} className="absolute bottom-0 right-0 text-pink-400 bg-gray-800 rounded-full" />}
                    </div>
                
                    <div className="flex flex-col flex-1 pt-16"> 
                        <h2 className="text-2xl text-white">
                            {profile.name}
                            <BadgeIcon level={badgeLevel} /> 
                            {/* Show Pro badge for Pro users */}
                            {isProUser() && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-600 flex items-center">
                                <Crown size={12} className="mr-1" />
                                PRO
                            </span>}
                        </h2>
                        <p className="text-purple-400">{profile.username}</p>

                        <p className="text-xs text-yellow-400 mt-1">
                            Global Glow Rank: **#{glowRank.toLocaleString()}**
                        </p>
                    </div>

                    <div className="space-y-3 mt-4">
                        <p className="flex items-center text-sm text-gray-300">
                          <MapPin size={16} className="mr-3 text-purple-400" />
                          {profile.location}
                        </p>
                        {profile.ndaAccepted && (
                            <p className="flex items-center text-xs text-green-400">
                                <Shield size={14} className="mr-2" />
                                NDA Accepted (Innovator Status)
                            </p>
                        )}
                        <p className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-800">
                          <User size={14} className="mr-2" />
                         Member Since {new Date(profile.created_at || Date.now()).getFullYear()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-700">
              <h3 className="text-xl mb-3 text-white">Gamification Status</h3>
              <div className="flex justify-around items-center space-x-4">
                <GlowScoreGauge score={glowScore} />
                <div className="flex flex-col space-y-2 flex-1">
                    <div className="p-2 bg-gray-700/50 rounded-lg flex justify-between items-center">
                        <span className="text-sm text-gray-400">Rank:</span>
                        <span className="text-cyan-400">#{glowRank.toLocaleString()}</span>
                    </div>
                </div>
              </div>
              
               <div className="grid grid-cols-2 gap-3 mt-4">
                <StatCard label="Followers" value={profile.stats.followers} icon={User} />
                <StatCard label="Views (7D)" value={profile.stats.viewsThisWeek} icon={TrendingUp} />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <h3 className="flex items-center text-xl mb-3 text-white">
                <Target size={20} className="mr-2 text-purple-400" />
                Weekly Missions
              </h3>
              <div className="space-y-3">
                {profile.missions.map((mission: any) => (
                  <div key={mission.id} className={`p-3 rounded-lg flex justify-between items-center ${mission.completed ? 'bg-green-900/40' : 'bg-gray-700/50'}`}>
                    <div className="flex flex-col">
                      <p className={` ${mission.completed ? 'text-green-300 line-through' : 'text-gray-200'}`}>{mission.text}</p>
                      <p className="text-xs text-purple-400 mt-1">+{mission.points} Pts</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.info('Leaderboard coming soon!')} className="w-full mt-4 text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center">
                View Leaderboard <ChevronRight size={16} className="ml-1" />
              </button>
            </div>

          </div>

          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <h3 className="text-xl mb-3 text-white">About {profile.name.split(' ')[0]}</h3>
              <p className="text-gray-300 leading-relaxed">{profile.bio}</p>

              {profile.website && (
                  <p className="flex items-center text-sm text-purple-400 mt-4">
                      <Link size={16} className="mr-3" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {profile.website.replace(/(^\w+:|^)\/\//, '').split('/')[0]}
                      </a>
                  </p>
              )}

              <div className="flex justify-between items-center">
                  <button onClick={() => setShowModal('editProfile')} className="mt-4 text-sm text-pink-400 hover:text-pink-300 flex items-center">
                      <Edit size={16} className="mr-1" />
                      Edit Profile
                  </button>
                  <button onClick={() => setShowModal('share')} className="mt-4 text-sm text-gray-400 hover:text-white flex items-center">
                      <Share2 size={16} className="mr-1" />
                      Share
                  </button>
              </div>

              <div className="bg-gray-700/50 p-4 rounded-xl mt-6 border border-gray-600">
                <h4 className="text-white flex items-center">
                  <TrendingUp size={18} className="mr-2 text-green-400"/> Profile Insights
                </h4>
                <p className="text-gray-400 text-sm mt-1">
                    **Engagement Rate:** 12.4% | **Avg Reel Views:** 3.1K | **Bookings Conversion:** 18%
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-900/40 rounded-xl border border-yellow-700 shadow-lg">
                <h3 className="flex items-center text-lg text-yellow-300 mb-3 border-b border-yellow-700 pb-2">
                  <Zap size={20} className="mr-2" />
                  AI Trend & Learning Panel
                </h3>
                
                <p className="text-sm text-yellow-100">
                  **Current Trend:** Global search interest for "Metallic Eyeshadow" has spiked by 40% in your region. Suggestion: Create a 60s inspired metallic eye tutorial.
                </p>
                <button onClick={handleRefreshTrends} className="text-xs text-yellow-400 hover:text-yellow-300 mt-2 flex items-center">
                    <RefreshCcw size={14} className="mr-1" /> Refresh Trends
                </button>

                <div className="mt-6 pt-4 border-t border-yellow-700">
                    <h4 className="text-sm text-yellow-300 mb-2">Recommendation History (Last 3)</h4>
                    <ul className="space-y-1">
                        {profile.aiHistory.map((item: any, index: number) => (
                            <li key={index} className="text-xs text-yellow-200 flex items-center">
                                <Clipboard size={12} className="mr-2 opacity-70 flex-shrink-0" />
                                <span className="truncate">{item.trend}</span>
                                <span className="ml-auto text-yellow-400/70"> ({item.date.substring(5)})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <div className="pt-4 min-h-[300px]">
                {renderFeedContent({ isLocked: profile.settings.isProfilePrivate })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showModal === 'bookings' && ( 
        <BookingsModal 
          onClose={() => setShowModal(null)} 
        />
      )}
      {showModal === 'editProfile' && (
        <EditProfileModal 
          profile={profile || initialProfileData}
          setProfile={setProfile} 
          onClose={() => setShowModal(null)} 
        />
      )}
      {showModal === 'settings' && (
          <SettingsModal 
              profile={profile} 
              setProfile={setProfile} 
              onClose={() => setShowModal(null)} 
          />
      )}
      {showModal === 'share' && (<ShareModal profile={profile} onClose={() => setShowModal(null)} />)}

    </div>
  );
}
