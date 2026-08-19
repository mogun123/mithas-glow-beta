import React, { useState } from 'react';
import { Star, BadgeCheck, MapPin, Share2, MessageCircle, Instagram, Youtube, X } from 'lucide-react';
import type { Artist } from '../../../hooks/use-booking';

interface ArtistProfileHeaderProps {
  artist: Artist;
  socialLinks?: Array<{ platform: string; url: string }>;
  onMessageArtist: () => void;
  onShareProfile: () => void;
}

export const ArtistProfileHeader: React.FC<ArtistProfileHeaderProps> = ({
  artist,
  socialLinks,
  onMessageArtist,
  onShareProfile,
}) => {
  const displayName = artist.shop_name || artist.full_name || artist.username || 'Makeup Artist';
  const isVerified = artist.seller_status === 'verified';
  const rating = artist.average_rating ? artist.average_rating.toFixed(1) : 'N/A';
  const reviewCount = artist.total_reviews || 0;

  const avatarUrl = artist.avatar_url || (artist as any).photoUrl || (artist as any).shop_logo_url;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ArtistProfileDebug]', {
      viewedArtistId: artist.id,
      profileImageField: artist.avatar_url ? 'avatar_url' : (artist as any).photoUrl ? 'photoUrl' : (artist as any).shop_logo_url ? 'shop_logo_url' : 'none',
      profileImageUrl: avatarUrl || null,
      imageSource: artist.avatar_url ? 'profiles.avatar_url' : 'fallback',
    });
  }

  const instagramLink = socialLinks?.find(l => l.platform === 'instagram');
  const youtubeLink = socialLinks?.find(l => l.platform === 'youtube');

  const formatProfession = (ind?: string | null) => {
    if (!ind) return 'Professional Makeup Artist';
    return ind.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  return (
    <div className="px-4 pt-2.5 pb-2.5 bg-white border-b border-pink-50">
      {/* Top Main Row: Avatar + Info + Share */}
      <div className="flex items-start gap-2.5">
        {/* Compact Avatar Frame (56x56) */}
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => avatarUrl && setShowAvatarPreview(true)}>
          <div className="w-[56px] h-[56px] rounded-xl bg-gradient-to-br from-pink-100 to-purple-200 p-0.5 shadow-xs">
            <div className="w-full h-full rounded-[10px] overflow-hidden bg-white flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover max-w-full max-h-full" />
              ) : (
                <span className="text-lg">💄</span>
              )}
            </div>
          </div>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              <BadgeCheck className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Profile Image View Modal (Constrained to 240px frame) */}
        {showAvatarPreview && avatarUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAvatarPreview(false)}
          >
            <div
              className="bg-white p-3 rounded-2xl max-w-[260px] w-full flex flex-col items-center shadow-xl border border-pink-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAvatarPreview(false)}
                className="absolute top-2 right-2 p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-[200px] h-[200px] rounded-xl overflow-hidden shadow-xs border border-pink-100 mb-2 mt-2 bg-slate-50">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              </div>
              
              <p className="text-xs font-bold text-slate-900 text-center truncate max-w-full">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-500 text-center">Verified Professional Profile</p>
            </div>
          </div>
        )}

        {/* Info Column */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1 mb-0.5">
            <h1 className="text-[14px] font-bold text-slate-900 truncate leading-snug">
              {displayName}
            </h1>
            {isVerified && (
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-0.5 text-[10px]">
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-900 border border-amber-100">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
            <span className="text-slate-500 font-medium text-[10px]">
              ({reviewCount} reviews)
            </span>
          </div>

          {/* Profession & City */}
          <p className="text-[10px] text-slate-600 font-medium mb-0.5">
            {formatProfession(artist.industry)}
            {artist.experience ? ` · ${artist.experience}` : ''}
          </p>

          {(artist.location_city || artist.city) && (
            <div className="flex items-center gap-0.5 text-slate-500 text-[10px]">
              <MapPin className="w-2.5 h-2.5 text-pink-500 flex-shrink-0" />
              <span className="truncate">{artist.location_city || artist.city}</span>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={onShareProfile}
          className="flex-shrink-0 p-1.5 bg-slate-50 rounded-lg border border-slate-200/80 text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors active:scale-95 shadow-xs"
          aria-label="Share profile"
        >
          <Share2 className="w-3 h-3" />
        </button>
      </div>

      {/* Bio */}
      {artist.bio && (
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <p className="text-[11px] text-slate-600 leading-tight font-normal line-clamp-2">
            {artist.bio}
          </p>
        </div>
      )}

      {/* Specialities Pills */}
      {artist.specialities && (
        <div className="mt-2 flex flex-wrap gap-1">
          {artist.specialities.split(',').slice(0, 5).map((spec, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.2 bg-pink-50/80 border border-pink-100 rounded-full text-[9px] font-medium text-slate-700"
            >
              {spec.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons: Message & Socials */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={onMessageArtist}
          className="flex-1 py-1.5 px-2.5 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-lg font-semibold text-[11px] shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <MessageCircle className="w-3 h-3" />
          <span>Message Artist</span>
        </button>

        {instagramLink && (
          <a
            href={instagramLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 rounded-lg text-white shadow-xs flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Instagram"
          >
            <Instagram className="w-3 h-3" />
          </a>
        )}

        {youtubeLink && (
          <a
            href={youtubeLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-red-600 rounded-lg text-white shadow-xs flex items-center justify-center active:scale-95 transition-transform"
            aria-label="YouTube"
          >
            <Youtube className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
