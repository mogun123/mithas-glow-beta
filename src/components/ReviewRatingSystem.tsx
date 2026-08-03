import { useState } from 'react';
import { X, Star, ThumbsUp, Camera, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  createdAt: Date;
  verified: boolean;
}

interface ReviewRatingSystemProps {
  productId?: string;
  vendorId?: string;
  productName: string;
  onClose: () => void;
  onSubmitReview?: (review: Omit<Review, 'id' | 'userId' | 'createdAt' | 'helpful'>) => void;
  existingReviews?: Review[];
}

interface ReviewFormData {
  rating: number;
  title: string;
  comment: string;
  images: string[];
}

export function ReviewRatingSystem({
  productId,
  vendorId,
  productName,
  onClose,
  onSubmitReview,
  existingReviews = []
}: ReviewRatingSystemProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    title: '',
    comment: '',
    images: []
  });
  const [submitted, setSubmitted] = useState(false);

  // Mock existing reviews if none provided
  const reviews = existingReviews.length > 0 ? existingReviews : [
    {
      id: '1',
      userId: '1',
      userName: 'Priya Sharma',
      userPhoto: 'https://placehold.co/40x40/ec4899/ffffff?text=PS',
      rating: 5,
      title: 'Absolutely love it!',
      comment: 'The quality is amazing and the delivery was super fast. The vendor was very helpful and professional.',
      images: ['https://placehold.co/200x200/f87171/ffffff?text=Photo1'],
      helpful: 24,
      createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
      verified: true
    },
    {
      id: '2',
      userId: '2',
      userName: 'Ananya Singh',
      userPhoto: 'https://placehold.co/40x40/8b5cf6/ffffff?text=AS',
      rating: 4,
      title: 'Great product',
      comment: 'Good quality but took a bit longer to arrive than expected. Overall satisfied with the purchase.',
      helpful: 12,
      createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
      verified: true
    },
    {
      id: '3',
      userId: '3',
      userName: 'Rahul Verma',
      rating: 5,
      comment: 'Exceeded my expectations! Will definitely order again.',
      helpful: 8,
      createdAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
      verified: false
    }
  ];

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => 
    reviews.filter(r => r.rating === rating).length
  );

  const handleSubmit = () => {
    if (formData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (formData.comment.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    const newReview = {
      userName: 'You',
      userPhoto: 'https://placehold.co/40x40/ec4899/ffffff?text=U',
      rating: formData.rating,
      title: formData.title,
      comment: formData.comment,
      images: formData.images,
      verified: true
    };

    if (onSubmitReview) {
      onSubmitReview(newReview);
    }

    setSubmitted(true);
    setTimeout(() => {
      toast.success('Review submitted successfully!');
      onClose();
    }, 2000);
  };

  const handleAddPhoto = () => {
    // Mock photo addition
    const newPhoto = `https://placehold.co/200x200/f87171/ffffff?text=Photo${formData.images.length + 1}`;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, newPhoto]
    }));
    toast.success('Photo added');
  };

  const handleHelpful = (reviewId: string) => {
    toast.success('Marked as helpful!');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600">Your review has been submitted successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl mb-1">
              {view === 'list' ? 'Reviews & Ratings' : 'Write a Review'}
            </h2>
            <p className="text-white/90 text-sm">{productName}</p>
          </div>

          {view === 'list' ? (
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              {/* Rating Summary */}
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl text-gray-900 mb-1">
                      {avgRating.toFixed(1)}
                    </div>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= avgRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{reviews.length} reviews</p>
                  </div>

                  <div className="flex-1 space-y-2">
                    {ratingCounts.map((count, index) => {
                      const rating = 5 - index;
                      const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setView('create')}
                  className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl hover:shadow-lg transition-all"
                >
                  Write a Review
                </button>
              </div>

              {/* Reviews List */}
              <div className="divide-y">
                {reviews.map((review) => (
                  <div key={review.id} className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={review.userPhoto || 'https://placehold.co/40x40/ec4899/ffffff?text=U'}
                        alt={review.userName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900">{review.userName}</span>
                          {review.verified && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {review.title && (
                      <h4 className="text-gray-900 mb-2">{review.title}</h4>
                    )}
                    <p className="text-gray-600 text-sm mb-3">{review.comment}</p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {review.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Review ${idx + 1}`}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleHelpful(review.id)}
                      className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors text-sm"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Helpful ({review.helpful})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              {/* Rating Selection */}
              <div className="mb-6 text-center">
                <p className="text-gray-600 mb-3">How would you rate this?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {formData.rating > 0 && (
                  <p className="text-gray-600 text-sm mt-2">
                    {formData.rating === 5 && '⭐ Excellent!'}
                    {formData.rating === 4 && '👍 Good!'}
                    {formData.rating === 3 && '😊 Average'}
                    {formData.rating === 2 && '😕 Below Average'}
                    {formData.rating === 1 && '😞 Poor'}
                  </p>
                )}
              </div>

              {/* Title (Optional) */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Review Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  maxLength={100}
                />
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  rows={5}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.comment.length}/500 characters
                </p>
              </div>

              {/* Photos */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 text-sm">Add Photos (Optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Upload ${idx + 1}`} className="w-20 h-20 rounded-lg object-cover" />
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 3 && (
                    <button
                      onClick={handleAddPhoto}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-pink-500 hover:bg-pink-50 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Up to 3 photos</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setView('list')}
                  className="flex-1 border border-gray-200 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={formData.rating === 0 || formData.comment.trim().length < 10}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
