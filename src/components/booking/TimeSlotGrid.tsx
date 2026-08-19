import React from 'react';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  onSelectSlot: (time: string) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({ slots, selectedSlot, onSelectSlot }) => {
  return (
    <div className="flex gap-2.5 overflow-x-auto py-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {slots.map((slot, index) => {
        const isSelected = selectedSlot === slot.time;
        const isUnavailable = !slot.available;

        return (
          <button
            key={index}
            type="button"
            onClick={() => slot.available && onSelectSlot(slot.time)}
            disabled={isUnavailable}
            className={`flex-shrink-0 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              isUnavailable
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 border border-slate-200'
                : isSelected
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md scale-105'
                : 'bg-white text-slate-800 border border-slate-100 hover:border-pink-200 shadow-sm'
            }`}
            style={{ minWidth: '76px' }}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
};
