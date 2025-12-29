import { useState, useEffect } from "react";
import { Star } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user_email?: string;
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number;
}

interface ReviewListProps {
  assetId: string;
  refreshTrigger?: number;
  currentUserEmail?: string;
  onUserReviewFound?: (hasReview: boolean) => void;
}

export function ReviewList({ assetId, refreshTrigger, currentUserEmail, onUserReviewFound }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`${API_URL}/api/reviews/${assetId}`);
        const data = await response.json() as ReviewsResponse;
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        
        // Check if current user has already reviewed
        if (currentUserEmail && onUserReviewFound) {
          const userHasReview = data.reviews?.some(
            (r) => r.user_email?.toLowerCase() === currentUserEmail.toLowerCase()
          ) ?? false;
          onUserReviewFound(userHasReview);
        }
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [assetId, refreshTrigger, currentUserEmail, onUserReviewFound]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (email?: string) => {
    if (!email) return "?";
    return email.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {/* Average Rating Summary */}
      {totalReviews > 0 && (
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  averageRating && star <= Math.round(averageRating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-ink">{averageRating?.toFixed(1)}</span>
            {" "} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No reviews yet. Be the first to share your experience!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary">
                  {getInitials(review.user_email)}
                </span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Stars */}
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= review.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
