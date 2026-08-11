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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVacationMode, setIsVacationMode] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState(60);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(5);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Load availability settings from Supabase on mount
  const loadSettings = async () => {
    try {
      setErrorMessage(null);
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
      const message = err?.message || 'Failed to load availability';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
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
      setErrorMessage(null);
      
      // Build operating_hours JSONB object matching get_available_slots SQL function format
      const operatingHours: Record<string, any> = {};
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      dayNames.forEach((day, idx) => {
        if (workingDays.includes(idx)) {
          operatingHours[day] = { start: startTime, end: endTime };
        }
      });

      const availabilitySettings = {
        slotDuration,
        maxBookingsPerDay,
        vacationMode: isVacationMode,
        blockedDates,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          operating_hours: JSON.stringify(operatingHours),
          availability_settings: JSON.stringify(availabilitySettings),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artistId);

      if (profileError) throw profileError;

      toast.success('Availability settings saved!');
    } catch (error: any) {
      const message = error?.message || 'Failed to save settings';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBlockDate = async (date: string) => {
    if (!blockedDates.includes(date)) {
      const newBlockedDates = [...blockedDates, date];

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
        setBlockedDates(newBlockedDates);
        setErrorMessage(null);
        toast.success('Date blocked');
      } catch (err: any) {
        const message = err?.message || 'Failed to block date';
        setErrorMessage(message);
        toast.error(message);
      }
    }
  };

  const handleUnblockDate = async (date: string) => {
    const newBlockedDates = blockedDates.filter(d => d !== date);

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
      setBlockedDates(newBlockedDates);
      setErrorMessage(null);
      toast.success('Date unblocked');
    } catch (err: any) {
      const message = err?.message || 'Failed to unblock date';
      setErrorMessage(message);
      toast.error(message);
    }
  };

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="rounded-2xl border border-pink-200 bg-pink-50/70 p-6 text-center max-w-md">
          <p className="text-sm font-semibold text-pink-600">{errorMessage}</p>
          <Button variant="outline" className="mt-4 border-pink-200 text-pink-200 hover:bg-pink-100" onClick={() => void loadSettings()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-[#2d1b4e] rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-pink-600/70">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-pink-50/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900">Availability</h1>
              <p className="text-[10px] text-pink-600/70">Manage your schedule</p>
            </div>
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-200"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Vacation Mode */}
        <Card className="bg-pink-50/70 border-pink-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isVacationMode ? 'bg-pink-100' : 'bg-purple-100'}`}>
                  {isVacationMode ? <AlertCircle className="w-5 h-5 text-pink-500" /> : <CheckCircle className="w-5 h-5 text-purple-500" />}
                </div>
                <div>
                  <CardTitle className="text-sm font-black text-slate-900">Vacation Mode</CardTitle>
                  <p className="text-[10px] text-pink-600/70">Temporarily stop accepting bookings</p>
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
              <p className="text-xs text-pink-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                You are currently not accepting any bookings
              </p>
            </CardContent>
          )}
        </Card>

        {/* Working Days */}
        <Card className="bg-pink-50/70 border-pink-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-pink-500" />
              <div>
                <CardTitle className="text-sm font-black text-slate-900">Working Days</CardTitle>
                <p className="text-[10px] text-pink-600/70">Select your available days</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day, index) => (
                <button
                  key={day}
                  onClick={() => handleToggleWorkingDay(index)}
                  className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all ${
                    workingDays.includes(index)
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200'
                      : 'bg-white/50 text-pink-600/70 border border-pink-100 hover:border-pink-500/40'
                  }`}
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="bg-pink-50/70 border-pink-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-pink-500" />
              <div>
                <CardTitle className="text-sm font-black text-slate-900">Working Hours</CardTitle>
                <p className="text-[10px] text-pink-600/70">Set your daily availability</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-pink-600/70 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-pink-200 rounded-xl text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-pink-600/70 mb-1 block">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-pink-200 rounded-xl text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Settings */}
        <Card className="bg-pink-50/70 border-pink-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Coffee className="w-5 h-5 text-pink-500" />
              <div>
                <CardTitle className="text-sm font-black text-slate-900">Booking Settings</CardTitle>
                <p className="text-[10px] text-pink-600/70">Configure slot duration and limits</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-pink-600/70 mb-1 block">Slot Duration (minutes)</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-pink-200 rounded-xl text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-pink-500"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-pink-600/70 mb-1 block">Max Bookings Per Day</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxBookingsPerDay}
                onChange={(e) => setMaxBookingsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-pink-200 rounded-xl text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-pink-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocked Dates */}
        <Card className="bg-pink-50/70 border-pink-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-pink-500" />
              <div>
                <CardTitle className="text-sm font-black text-slate-900">Blocked Dates</CardTitle>
                <p className="text-[10px] text-pink-600/70">{blockedDates.length} dates blocked</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {blockedDates.length === 0 ? (
              <p className="text-xs text-pink-600/70 text-center py-4">No blocked dates</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedDates.map(date => (
                  <Badge
                    key={date}
                    variant="outline"
                    className="cursor-pointer hover:bg-pink-100 hover:border-pink-500/40 border-pink-200 text-pink-600"
                    onClick={() => handleUnblockDate(date)}
                  >
                    {new Date(date).toLocaleDateString()} ✕
                  </Badge>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-4 border-pink-200 text-pink-200 hover:bg-pink-100"
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
        <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-100">
          <CardContent className="pt-6">
            <h3 className="text-xs font-black text-slate-900 mb-3">Weekly Schedule Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-pink-600/70">Working Days:</span>
                <span className="font-bold text-slate-900">{workingDays.length} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-pink-600/70">Daily Hours:</span>
                <span className="font-bold text-slate-900">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-pink-600/70">Slot Duration:</span>
                <span className="font-bold text-slate-900">{slotDuration} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-pink-600/70">Max Bookings:</span>
                <span className="font-bold text-slate-900">{maxBookingsPerDay} / day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
