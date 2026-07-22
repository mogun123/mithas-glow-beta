import { X, Aperture, Lightbulb } from 'lucide-react';

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureSelect: (feature: string) => void;
}

export function FeatureModal({ isOpen, onClose, onFeatureSelect }: FeatureModalProps) {
  if (!isOpen) return null;

  const handleFeatureClick = (feature: string) => {
    onFeatureSelect(feature);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-white/95 backdrop-blur-lg z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`modal-bg p-6 rounded-3xl max-w-sm w-11/12 transform transition-transform duration-300 relative border border-gray-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl text-transparent bg-clip-text glow-accent mb-6 text-center">
          ✨ Special Features Hub
        </h3>

        <div className="space-y-4">
          <button
            onClick={() => handleFeatureClick('Virtual Teleport Photoshoot')}
            className="w-full p-4 text-lg text-white rounded-xl bg-purple-500 shadow-xl shadow-purple-400/40 hover:bg-purple-600 transition-transform active:scale-95"
          >
            <Aperture className="w-5 h-5 inline mr-2" /> Virtual Teleport Photoshoot
          </button>
          <button
            onClick={() => handleFeatureClick('Innovators Hub')}
            className="w-full p-4 text-lg text-white rounded-xl bg-pink-500 shadow-xl shadow-pink-400/40 hover:bg-pink-600 transition-transform active:scale-95"
          >
            <Lightbulb className="w-5 h-5 inline mr-2" /> Innovators Hub
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Discover the future of beauty and creation.
        </p>
      </div>
    </div>
  );
}
