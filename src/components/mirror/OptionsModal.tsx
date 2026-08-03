import React from 'react';
import { X, CheckCircle, Video, Droplets, Calendar } from 'lucide-react';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export function OptionsModal({ isOpen, onClose, onAction }: OptionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-xs transform transition-all scale-100">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl text-gray-800">Available Options</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => onAction('Select Look')}
            className="bg-green-400 text-white py-3 px-4 rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center shadow-md"
          >
            <CheckCircle className="w-5 h-5 mr-2" /> Select This Look
          </button>
          <button
            onClick={() => onAction('Start Reels Creator')}
            className="bg-orange-400 text-white py-3 px-4 rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center shadow-md"
          >
            <Video className="w-5 h-5 mr-2" /> Create Before/After Reels
          </button>
          <button
            onClick={() => onAction('Do It Yourself')}
            className="bg-pink-400 text-white py-3 px-4 rounded-xl hover:bg-pink-500 transition-colors flex items-center justify-center shadow-md"
          >
            <Droplets className="w-5 h-5 mr-2" /> AI Assisted DIY Guide
          </button>
          <button
            onClick={() => onAction('Book Artist')}
            className="bg-yellow-400 text-white py-3 px-4 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center shadow-md"
          >
            <Calendar className="w-5 h-5 mr-2" /> Book an Artist
          </button>
        </div>
      </div>
    </div>
  );
}
