import React, { useState } from 'react';
import { X, Calendar, Clock, Bell } from 'lucide-react';

interface ScheduleScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: Date, time: string) => void;
}

export const ScheduleScanModal: React.FC<ScheduleScanModalProps> = ({
  isOpen,
  onClose,
  onSchedule
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('08:00');

  if (!isOpen) return null;

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSchedule = () => {
    if (selectedDate) {
      const scheduledDate = new Date(`${selectedDate}T${selectedTime}:00`);
      onSchedule(scheduledDate, selectedTime);
      onClose();
    }
  };

  const calculateTimeRemaining = (scheduledDate: Date) => {
    const now = new Date();
    const diff = scheduledDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days} days and ${remainingHours} hours`;
    } else if (hours > 0) {
      return `${hours} hours`;
    } else {
      return 'Less than 1 hour';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Schedule Next Scan</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Date Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={minDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Time Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Select Time
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, '0');
              return (
                <option key={hour} value={`${hour}:00`}>
                  {hour}:00
                </option>
              );
            })}
          </select>
        </div>

        {/* Preview */}
        {selectedDate && (
          <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Reminder Preview</span>
            </div>
            <div className="text-sm text-purple-700">
              Your next scan is scheduled for:
            </div>
            <div className="font-semibold text-purple-900">
              {new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString()} at {selectedTime}
            </div>
            <div className="text-sm text-purple-600 mt-1">
              Time remaining: {calculateTimeRemaining(new Date(`${selectedDate}T${selectedTime}:00`))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={!selectedDate}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Schedule Scan
          </button>
        </div>
      </div>
    </div>
  );
};
