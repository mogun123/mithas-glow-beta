import React, { useState } from 'react';
import { Star, CheckCircle, User, ChevronRight, X } from 'lucide-react';
import type { ArtistReview, ReviewSummary } from '../../hooks/useArtistReviews';

interface ArtistReviewsListProps {
  reviews: ArtistReview[];
  summary: ReviewSummary | null;
  loading: boolean;
}

export const ArtistReviewsList: React.FC<ArtistReviewsListProps> = ({
  reviews,
  summary,
  loading,
}) => {
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);

  if (loading) {
    return (
      <div className="mt-6 px-4 py-6 text-center">
        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading customer reviews...</p>
      </div>
    );
  }

  const topReviews = (reviews || []).slice(0, 3);

  return (
    <div className="mt-4 px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          Customer Reviews
        </h2>
        {summary && summary.total_reviews > 3 && (
          <button
            onClick={() => setShowAllReviewsModal(true)}
            className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-0.5"
          >
            <span>View All ({summary.total_reviews})</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {reviews && reviews.length > 0 ? (
        <>
          {/* Summary Box */}
          {summary && (
            <div className="mb-2.5 p-3 bg-gradient-to-r from-amber-50/80 to-orange-50/40 rounded-xl border border-amber-100/80 flex items-center gap-3">
              <div className="text-center px-1">
                <div className="text-2xl font-extrabold text-slate-900 leading-none mb-1">
                  {summary.average_rating.toFixed(1)}
                </div>
                <div className="flex gap-0.5 justify-center mb-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-2.5 h-2.5 ${
                        star <= Math.round(summary.average_rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-semibold">{summary.total_reviews} reviews</p>
              </div>

              {/* Breakdown Bars */}
              <div className="flex-1 space-y-0.5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = summary.rating_distribution[rating as keyof typeof summary.rating_distribution] || 0;
                  const pct = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 w-2.5">{rating}</span>
                      <div className="flex-1 bg-amber-100/60 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 w-3 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top 3 Reviews */}
          <div className="space-y-2">
            {topReviews.map((review) => (
              <div key={review.id} className="p-2.5 bg-white rounded-xl border border-pink-50 shadow-xs">
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-pink-100">
                    {review.customer_avatar_url ? (
                      <img src={review.customer_avatar_url} alt={review.customer_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-pink-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-[12px] font-bold text-slate-900 truncate">
                        {review.customer_name}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-2.5 h-2.5 ${
                              star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      {review.is_verified && (
                        <span className="ml-1 text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded-full inline-flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-[12px] text-slate-600 leading-snug font-normal">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-6 px-4 text-center bg-white rounded-xl border border-pink-50">
          <Star className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-700 mb-0.5">No reviews yet</p>
          <p className="text-[11px] text-slate-400">Be the first to review this artist after your appointment!</p>
        </div>
      )}

      {/* All Reviews Modal */}
      {showAllReviewsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowAllReviewsModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                All Reviews ({reviews.length})
              </h3>
              <button
                onClick={() => setShowAllReviewsModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 max-h-[calc(85vh-60px)]">
              {reviews.map((review) => (
                <div key={review.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-pink-100">
                      {review.customer_avatar_url ? (
                        <img src={review.customer_avatar_url} alt={review.customer_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {review.customer_name}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
