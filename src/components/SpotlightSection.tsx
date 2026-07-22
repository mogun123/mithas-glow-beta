import { MapPin, Crown, Zap } from 'lucide-react';

interface SpotlightSectionProps {
  onSpotlightClick: (title: string) => void;
}

export function SpotlightSection({ onSpotlightClick }: SpotlightSectionProps) {
  const spotlightCards = [
    {
      title: 'Trending Teleport Location',
      subtitle: 'AI-Powered Suggestion',
      detail: '"Kyoto Cherry Blossom"',
      icon: MapPin,
      iconColor: 'text-pink-600',
      borderColor: 'border-[#C0A0FF]',
    },
    {
      title: 'Top Bridal Artist Near You',
      subtitle: 'Recommended Creator',
      detail: 'Artist: Janani S.',
      icon: Crown,
      iconColor: 'text-purple-600',
      borderColor: 'border-[#FF99CC]',
    },
    {
      title: 'Most-Liked Virtual Look',
      subtitle: 'AR Data Trend',
      detail: '"Neon Euphoria Liner"',
      icon: Zap,
      iconColor: 'text-blue-600',
      borderColor: 'border-[#FFD700]',
    },
  ];

  return (
    <section className="mt-2 mb-6 -mx-4 px-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl text-gray-800 flex items-center">Glow Spotlight</h2>
        <span className="text-sm gold-shimmer-underline">
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(90deg, #FF99CC, #FFD700)' }}
          >
            Recommended 💎
          </span>
        </span>
      </div>

      <div className="spotlight-slider flex space-x-4 overflow-x-scroll pb-3">
        {spotlightCards.map((card, index) => (
          <button
            key={index}
            onClick={() => onSpotlightClick(card.title)}
            className={`spotlight-card flex-shrink-0 w-64 h-24 p-3 rounded-xl border-2 ${card.borderColor} shadow-xl relative transition-all active:scale-[0.98]`}
          >
            <div className="z-10 relative text-left">
              <p className="text-xs text-gray-600">{card.subtitle}</p>
              <h4 className="text-lg text-gray-900 leading-tight">{card.title}</h4>
              <p className={`text-xs ${card.iconColor} mt-1 flex items-center`}>
                <card.icon className="w-3 h-3 mr-1" /> {card.detail}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
