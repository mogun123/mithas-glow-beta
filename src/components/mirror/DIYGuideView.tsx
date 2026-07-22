import React, { useState } from 'react';
import { ArrowLeft, Volume2, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Mode, Language, ShopCategory } from '../../screens/MirrorScreen';
import { LOOKS_DATA, DIY_INSTRUCTIONS } from './data';

interface DIYGuideViewProps {
  mode: Mode;
  lookIndex: number;
  language: Language;
  onBackToMirror: () => void;
  onLanguageChange: (lang: Language) => void;
  onsetCurrentViewToShop: (category: ShopCategory) => void;
}

export function DIYGuideView({
  mode,
  lookIndex,
  language,
  onBackToMirror,
  onLanguageChange,
  onsetCurrentViewToShop,
}: DIYGuideViewProps) {
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const currentLook = LOOKS_DATA[mode][lookIndex];
  const instructions = DIY_INSTRUCTIONS[language];

  const handleTTS = () => {
    setIsTtsLoading(true);
    toast.success('Generating voice guide...');
    
    // Simulate TTS generation
    setTimeout(() => {
      setIsTtsLoading(false);
      toast.success('Voice Guide is playing!');
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full p-4 flex-grow pb-24">
      {/* DIY Header */}
      <div className="flex justify-between items-center w-full mb-6 sticky top-0 bg-gradient-to-b from-[#EBD8FF] to-transparent pt-4 pb-2 z-10">
        <button onClick={onBackToMirror} className="p-2 rounded-full hover:bg-white/50">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl text-pink-600">
          {language === 'ta' ? 'டிஐஒய் வழிகாட்டி' : 'DIY Guide'}: {currentLook.name}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => onLanguageChange('en')}
            className={`text-sm px-3 py-1 rounded-full transition-colors active:scale-95 ${
              language === 'en'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onLanguageChange('ta')}
            className={`text-sm px-3 py-1 rounded-full transition-colors active:scale-95 ${
              language === 'ta'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            TA
          </button>
        </div>
      </div>

      {/* TTS Button */}
      <button
        onClick={handleTTS}
        disabled={isTtsLoading}
        className={`w-full mb-4 py-3 rounded-xl text-white flex items-center justify-center transition-all ${
          isTtsLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-400 hover:bg-blue-500 active:scale-95'
        }`}
      >
        {isTtsLoading ? (
          <>
            <div className="spinner mr-2"></div> Generating Audio...
          </>
        ) : (
          <>
            <Volume2 className="w-5 h-5 mr-2" />
            {language === 'ta' ? 'வழிகாட்டியை கேளுங்கள்' : 'Listen to Guide (TTS)'}
          </>
        )}
      </button>

      {/* Instruction Steps */}
      <div className="space-y-6 flex-grow">
        {instructions.map((step, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-pink-500 transition-all duration-300 hover:shadow-xl"
          >
            <h3 className="text-lg text-gray-800 mb-1 flex items-center">
              <span className="bg-pink-500 text-white w-6 h-6 flex items-center justify-center rounded-full mr-2 text-sm">
                {index + 1}
              </span>
              {step.title}
            </h3>
            <p className="text-gray-600 ml-8">{step.detail}</p>
            <button
              onClick={() => onsetCurrentViewToShop('Makeup')}
              className="mt-3 text-xs text-purple-600 hover:underline flex items-center"
            >
              {language === 'ta' ? 'இந்த படிக்கு பொருட்களை வாங்கவும்' : 'Shop items for this step'}
              <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        ))}
      </div>

      {/* Complete Button */}
      <div className="mt-8 text-center sticky bottom-0 bg-white p-4 rounded-t-xl shadow-2xl">
        <button
          onClick={onBackToMirror}
          className="w-full bg-green-400 text-white py-3 rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          {language === 'ta' ? 'வழிகாட்டி முடிந்தது' : 'DIY Complete'}
        </button>
      </div>

      <style>{`
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-left-color: #fff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
