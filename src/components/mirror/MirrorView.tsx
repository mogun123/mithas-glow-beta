import React from 'react';
import { ChevronLeft, ChevronRight, EllipsisVertical, ScanFace, ShoppingBag, Video, Mic } from 'lucide-react';
import type { Mode, Customizations } from '../MirrorScreen';
import { LOOKS_DATA } from './data';

interface MirrorViewProps {
  mode: Mode;
  lookIndex: number;
  customizations: Customizations;
  onChangeLook: (index: number) => void;
  onBackToHome: () => void;
  onShowOptions: () => void;
  onShowChat: () => void;
  onAction: (action: string) => void;
}

export function MirrorView({
  mode,
  lookIndex,
  customizations,
  onChangeLook,
  onBackToHome,
  onShowOptions,
  onShowChat,
  onAction,
}: MirrorViewProps) {
  const looks = LOOKS_DATA[mode];
  const currentLook = looks[lookIndex];
  const totalLooks = looks.length;

  const getCustomizationDisplay = () => {
    const active = Object.entries(customizations)
      .filter(([_, value]) => value !== null)
      .map(([_, value]) => value);
    return active.length > 0 ? ` (+ ${active.join(', ')})` : '';
  };

  const handleNext = () => {
    onChangeLook((lookIndex + 1) % totalLooks);
  };

  const handlePrev = () => {
    onChangeLook((lookIndex - 1 + totalLooks) % totalLooks);
  };

  const isAISuggested = lookIndex === 0;

  return (
    <div className="w-full flex flex-col items-center p-4 flex-grow pb-28">
      {/* Header and Options */}
      <div className="flex justify-between items-center w-full mb-4">
        <button
          onClick={onBackToHome}
          className="p-2 rounded-full hover:bg-white/50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-lg text-gray-800">{mode} Mode</h2>
        <button
          onClick={onShowOptions}
          className="p-2 rounded-full hover:bg-white/50 transition-colors"
        >
          <EllipsisVertical className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* AR Mirror View Simulation */}
      <div className="mirror-view-container mb-6 flex items-center justify-center">
        <div className="text-white text-center">
          <ScanFace className="w-12 h-12 mb-2 animate-pulse text-pink-400 mx-auto" />
          <p className="text-sm">Live AR Applied: {currentLook.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {getCustomizationDisplay() || 'Tap screen to see Before/After'}
          </p>
        </div>
      </div>

      {/* Look Information */}
      <div className="w-full flex flex-col items-center p-3 bg-pink-50 rounded-xl shadow-md border border-pink-200">
        {isAISuggested && (
          <span className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center mb-2">
            <span className="mr-1">✨</span> AI Suggestion: Best for current time & location
          </span>
        )}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={handlePrev}
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-grow text-center mx-3">
            <p className="text-xs text-purple-600 uppercase">
              {lookIndex + 1} / {totalLooks} Looks
            </p>
            <h3 className="text-xl text-gray-900">{currentLook.name}</h3>
            {getCustomizationDisplay() && (
              <p className="text-sm text-purple-600">{getCustomizationDisplay()}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">{currentLook.desc}</p>
          </div>
          <button
            onClick={handleNext}
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Skin Health Analysis */}
      <div className="w-full mt-4 p-4 bg-purple-50 rounded-2xl shadow-inner border border-purple-200">
        <h3 className="flex items-center text-lg text-gray-800 mb-3">
          <span className="mr-2">💗</span> AI Skin Health Forecast
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Current Status */}
          <div className="p-3 rounded-xl bg-green-100 border border-green-300">
            <p className="text-xs text-green-700 mb-1 flex items-center">
              <span className="mr-1">📅</span> Current Status
            </p>
            <p className="text-sm text-gray-800">
              Hydration: <span className="text-red-500">Low</span>
            </p>
            <p className="text-sm text-gray-800">
              Tone Balance: <span className="text-yellow-600">Needs Attention</span>
            </p>
          </div>

          {/* Forecast */}
          <div className="p-3 rounded-xl bg-red-100 border border-red-300">
            <p className="text-xs text-red-700 mb-1 flex items-center">
              <span className="mr-1">📈</span> Next 7 Day Forecast
            </p>
            <p className="text-sm text-gray-800">
              Acne Risk: <span className="text-red-700">High (+7 Days)</span>
            </p>
            <p className="text-sm text-gray-800">
              Sensitivity: <span className="text-green-500">Normal</span>
            </p>
          </div>
        </div>

        <div className="mt-2 text-center">
          <button
            onClick={() => onAction('Buy Combo Kit')}
            className="w-full bg-pink-400 text-white py-2 rounded-lg text-sm hover:bg-pink-500 transition-colors"
          >
            <span className="mr-1">💧</span> View Recommended Skincare Products
          </button>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="w-full mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => onAction('Buy Combo Kit')}
          className="bg-blue-400 text-white py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors flex items-center justify-center"
        >
          <ShoppingBag className="w-4 h-4 mr-1" /> Buy Full Look Kit
        </button>
        <button
          onClick={() => onAction('Start Reels Creator')}
          className="bg-orange-400 text-white py-2 rounded-lg text-sm hover:bg-orange-500 transition-colors flex items-center justify-center"
        >
          <Video className="w-4 h-4 mr-1" /> Create Reels
        </button>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={onShowChat}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center active:scale-95"
      >
        <Mic className="w-7 h-7" />
      </button>
    </div>
  );
}
