import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  price: number;
  duration_minutes: number;
  description?: string;
}

interface ServiceCardProps {
  service: Service;
  isSelected?: boolean;
  onSelect: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer mb-3 relative overflow-hidden ${
        isSelected
          ? 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-500 ring-2 ring-pink-400/20 shadow-md'
          : 'bg-white border-slate-100 hover:border-pink-200 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-base font-bold text-slate-900 flex-1">{service.title}</h3>
        {isSelected && (
          <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
        )}
      </div>

      {service.description && (
        <p className="text-xs text-slate-600 mb-3 leading-relaxed line-clamp-2">
          {service.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600">
          <Clock className="w-3.5 h-3.5 text-pink-500" />
          <span>{service.duration_minutes} min</span>
        </div>
        <span className="text-base font-black text-slate-900">
          ₹{service.price.toLocaleString()}
        </span>
      </div>
    </button>
  );
};
