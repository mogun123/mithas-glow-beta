import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, User, ScanFace, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Mode } from '../../screens/MirrorScreen';
import { LOOKS_DATA } from './data';

interface ReelCreatorViewProps {
  mode: Mode;
  lookIndex: number;
  onBackToMirror: () => void;
}

export function ReelCreatorView({ mode, lookIndex, onBackToMirror }: ReelCreatorViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<{ audioTitle: string; duration: string } | null>(null);
  const [audioPrompt, setAudioPrompt] = useState('Epic cinematic transformation');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLook = LOOKS_DATA[mode][lookIndex];

  const handleGenerateAudio = () => {
    if (!audioPrompt.trim()) {
      toast.error('Please enter a song or dialogue prompt.');
      return;
    }

    toast.success(`AI generating audio for: "${audioPrompt.substring(0, 30)}..."`);

    setTimeout(() => {
      setGeneratedAudio({
        audioTitle: `⚡ ${audioPrompt.substring(0, 15)}... AI Mix`,
        duration: '0:15',
      });
      toast.success('AI Audio ready! You can start recording your Reel now.');
    }, 2500);
  };

  const handleToggleRecording = () => {
    if (!generatedAudio) {
      toast.error('Please generate audio first!');
      return;
    }

    setIsRecording(!isRecording);

    if (!isRecording) {
      toast.success(`Recording started! Audio: ${generatedAudio.audioTitle}`);
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isRecording) {
          setIsRecording(false);
          toast.success('Reel Recording Finished! (Saved)');
        }
      }, 10000);
    } else {
      toast.success('Reel Recording Finished! (Saved)');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateSlider(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateSlider(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateSlider(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      updateSlider(e.touches[0].clientX);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const updateSlider = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 max-w-lg mx-auto bg-black flex flex-col z-50">
      {/* Top Controls */}
      <div className="flex justify-between items-center w-full p-4 bg-black/50 sticky top-0 z-20">
        <button onClick={onBackToMirror} className="text-white p-2 rounded-full hover:bg-white/20">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm text-white">{currentLook.name} Reel</span>
        <button onClick={() => toast.success('Reel Settings Opened')} className="text-white p-2 rounded-full hover:bg-white/20">
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* AR View with Slider */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative w-full h-96 flex items-center justify-center cursor-ew-resize"
      >
        {/* Base (Before) Layer */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white opacity-50 text-center">
            <User className="w-16 h-16 mb-2 mx-auto" />
            <p className="text-xl">Before (No Makeup)</p>
          </div>
        </div>

        {/* After Layer (Overlay) */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-pink-900 flex items-center justify-center overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div className="text-white text-center">
            <ScanFace className="w-16 h-16 mb-2 text-pink-400 animate-pulse mx-auto" />
            <p className="text-xl">After ({currentLook.name})</p>
            <p className="text-sm">Drag to Compare</p>
          </div>
        </div>

        {/* Slider Handle */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/70 shadow-lg pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-pink-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Audio and Recording Controls */}
      <div className="p-4 w-full flex flex-col items-center flex-grow bg-black/80">
        {generatedAudio ? (
          <div className="flex items-center p-3 bg-white/20 rounded-xl mb-4 w-full">
            <span className="text-2xl mr-2">🎵</span>
            <div className="text-left flex-grow">
              <p className="text-sm text-white">{generatedAudio.audioTitle}</p>
              <p className="text-xs text-gray-300">Duration: {generatedAudio.duration}</p>
            </div>
            <button onClick={() => setGeneratedAudio(null)} className="p-1 text-red-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 bg-white/20 rounded-xl mb-4 text-center w-full">
            <p className="text-sm text-white mb-2">Generate AI Audio:</p>
            <input
              type="text"
              value={audioPrompt}
              onChange={(e) => setAudioPrompt(e.target.value)}
              placeholder="Song, Dialogue, or Trending Sound..."
              className="w-full p-2 rounded-lg text-sm text-gray-800 mb-2 focus:ring-pink-500 focus:border-pink-500"
            />
            <button
              onClick={handleGenerateAudio}
              className="w-full bg-orange-400 text-white py-2 rounded-lg text-sm hover:bg-orange-500 transition-colors flex items-center justify-center"
            >
              <WandSparkles className="w-4 h-4 mr-1" /> Generate AI Audio
            </button>
          </div>
        )}

        {/* Recording Button */}
        <div className="flex justify-center items-center w-full mb-6 mt-2">
          <button
            onClick={handleToggleRecording}
            className={`reel-record-button ${isRecording ? 'recording' : ''}`}
          >
            <div className="record-icon"></div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          {isRecording ? 'Recording... Slide bar to show transformation!' : 'Tap to record your AI Glow Reel.'}
        </p>
      </div>

      <style>{`
        .reel-record-button {
          width: 70px;
          height: 70px;
          background-color: white;
          border-radius: 50%;
          border: 6px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .reel-record-button.recording {
          background-color: red;
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(255, 0, 0, 0.3), 0 0 20px rgba(0, 0, 0, 0.6);
        }
        .record-icon {
          width: 25px;
          height: 25px;
          background-color: red;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        .reel-record-button.recording .record-icon {
          width: 15px;
          height: 15px;
          border-radius: 3px;
          background-color: white;
        }
      `}</style>
    </div>
  );
}
