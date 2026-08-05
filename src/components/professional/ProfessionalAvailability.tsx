import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Moon, Sun, Coffee, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AvailabilitySettings {
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  lunchBreakStart?: string;
  lunchBreakEnd?: string;
  slotDuration: number; // minutes
  maxBookingsPerDay: number;
  vacationMode: boolean;
  blockedDates: string[];
}

interface ProfessionalAvailabilityProps {
  artistId: string;
  onBack?: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfessionalAvailability({ artistId, onBack }: ProfessionalAvailabilityProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVacationMode, setIsVacationMode] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(5);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Load availability settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('operating_hours')
          .eq('id', artistId)
          .single();

        if (error) throw error;

        if (data?.operating_hours) {
          const hours = typeof data.operating_hours === 'string' 
            ? JSON.parse(data.operating_hours) 
            : data.operating_hours;
          
          // Parse operating_hours JSONB format: { "monday": {"start": "09:00", "end": "18:00"}, ... }
          if (hours.monday?.start) setStartTime(hours.monday.start);
          if (hours.monday?.end) setEndTime(hours.monday.end);
          
          // Extract working days from operating_hours
          const days: number[] = [];
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          dayNames.forEach((day, idx) => {
            if (hours[day]) days.push(idx);
          });
          if (days.length > 0) setWorkingDays(days);
        }

        // Load additional availability settings if stored as JSONB
        const { data: profileData } = await supabase
          .from('profiles')
          .select('availability_settings')
          .eq('id', artistId)
          .single();

        if (profileData?.availability_settings) {
          const settings = profileData.availability_settings;
          if (settings.slotDuration) setSlotDuration(settings.slotDuration);
          if (settings.maxBookingsPerDay) setMaxBookingsPerDay(settings.maxBookingsPerDay);
          if (settings.vacationMode !== undefined) setIsVacationMode(settings.vacationMode);
          if (settings.blockedDates) setBlockedDates(settings.blockedDates);
        }
      } catch (err: any) {
        console.error('ProfessionalAvailability: Load error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [artistId]);

  const handleToggleWorkingDay = (dayIndex: number) => {
    setWorkingDays(prev => 
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Build operating_hours JSONB object matching get_available_slots SQL function format
      const operatingHours: Record<string, any> = {};
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      dayNames.forEach((day, idx) => {
        if (workingDays.includes(idx)) {
          operatingHours[day] = { start: startTime, end: endTime };
        }
      });

      // Update profiles table with operating_hours
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          operating_hours: JSON.stringify(operatingHours),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artistId);

      if (profileError) throw profileError;

      // Save additional settings as availability_settings JSONB column
      const availabilitySettings = {
        slotDuration,
        maxBookingsPerDay,
        vacationMode: isVacationMode,
        blockedDates,
      };

      // Update availability_settings column (added in 20260805120000_professional_features.sql)
      const { error: settingsError } = await supabase
        .from('profiles')
        .update({
          availability_settings: JSON.stringify(availabilitySettings),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artistId);

      if (settingsError) {
        console.warn('Failed to save availability_settings:', settingsError.message);
        // Don't throw - operating_hours was saved successfully
      }

      toast.success('Availability settings saved!');
    } catch (error: any) {
      console.error('ProfessionalAvailability: Save error:', error.message);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockDate = async (date: string) => {
    if (!blockedDates.includes(date)) {
      const newBlockedDates = [...blockedDates, date];
      setBlockedDates(newBlockedDates);
      
      // Persist to Supabase availability_settings column
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            availability_settings: JSON.stringify({
              blockedDates: newBlockedDates,
              vacationMode: isVacationMode,
              slotDuration,
              maxBookingsPerDay,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', artistId);
        
        if (error) throw error;
        toast.success('Date blocked');
      } catch (err: any) {
        console.warn('Failed to persist blocked date:', err.message);
        toast.error('Failed to block date');
      }
    }
  };

  const handleUnblockDate = async (date: string) => {
    const newBlockedDates = blockedDates.filter(d => d !== date);
    setBlockedDates(newBlockedDates);
    
    // Persist to Supabase availability_settings column
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          availability_settings: JSON.stringify({
            blockedDates: newBlockedDates,
            vacationMode: isVacationMode,
            slotDuration,
            maxBookingsPerDay,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artistId);
      
      if (error) throw error;
      toast.success('Date unblocked');
    } catch (err: any) {
      console.warn('Failed to persist unblocked date:', err.message);
      toast.error('Failed to unblock date');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">Availability</h1>
              <p className="text-xs text-gray-500">Manage your schedule</p>
            </div>
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving}
              className="bg-[#D4AF37] hover:bg-[#B8962E] text-white"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Vacation Mode */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isVacationMode ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  {isVacationMode ? <AlertCircle className="w-5 h-5 text-orange-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <div>
                  <CardTitle className="text-base">Vacation Mode</CardTitle>
                  <p className="text-xs text-gray-500">Temporarily stop accepting bookings</p>
                </div>
              </div>
              <Switch
                checked={isVacationMode}
                onCheckedChange={setIsVacationMode}
              />
            </div>
          </CardHeader>
          {isVacationMode && (
            <CardContent>
              <p className="text-sm text-orange-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                You are currently not accepting any bookings
              </p>
            </CardContent>
          )}
        </Card>

        {/* Working Days */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="text-base">Working Days</CardTitle>
                <p className="text-xs text-gray-500">Select your available days</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day, index) => (
                <button
                  key={day}
                  onClick={() => handleToggleWorkingDay(index)}
                  className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    workingDays.includes(index)
                      ? 'bg-[#D4AF37] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="text-base">Working Hours</CardTitle>
                <p className="text-xs text-gray-500">Set your daily availability</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Coffee className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="text-base">Booking Settings</CardTitle>
                <p className="text-xs text-gray-500">Configure slot duration and limits</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slot Duration (minutes)</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max Bookings Per Day</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxBookingsPerDay}
                onChange={(e) => setMaxBookingsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocked Dates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="text-base">Blocked Dates</CardTitle>
                <p className="text-xs text-gray-500">{blockedDates.length} dates blocked</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No blocked dates</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedDates.map(date => (
                  <Badge
                    key={date}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50 hover:border-red-200"
                    onClick={() => handleUnblockDate(date)}
                  >
                    {new Date(date).toLocaleDateString()} ✕
                  </Badge>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                handleBlockDate(today);
              }}
            >
              Block Today
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Weekly Schedule Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Working Days</span>
                <span className="font-medium">{workingDays.length} days/week</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Hours</span>
                <span className="font-medium">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Slots/Day</span>
                <span className="font-medium">{maxBookingsPerDay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge className={isVacationMode ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                  {isVacationMode ? 'On Vacation' : 'Accepting Bookings'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
