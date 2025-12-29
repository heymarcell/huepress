import { useState, useCallback } from "react";
import { useSubscription } from "@/lib/auth";
import { useUser } from "@clerk/clerk-react";
import { ReviewList } from "@/components/features/ReviewList";
import { ReviewForm } from "@/components/features/ReviewForm";
import { CheckCircle } from "lucide-react";

interface ReviewsSectionProps {
  assetId: string;
  stats: { 
    avg: number | null; 
    count: number 
  };
  onStatsChange?: (stats: { avg: number | null; count: number }) => void;
}

export function ReviewsSection({ assetId, stats, onStatsChange }: ReviewsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const { isSubscriber } = useSubscription();
  const { user } = useUser();
  
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;

  const handleReviewSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
    setUserHasReviewed(true);
  };

  const handleUserReviewFound = useCallback((hasReview: boolean) => {
    setUserHasReviewed(hasReview);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-6 lg:p-8">
        <h2 className="font-serif text-h3 text-ink mb-6">
          Reviews {stats.count > 0 && <span className="text-gray-400 text-lg">({stats.count})</span>}
        </h2>
        
        {/* Review List */}
        <ReviewList 
          assetId={assetId} 
          refreshTrigger={refreshTrigger}
          currentUserEmail={currentUserEmail}
          onUserReviewFound={handleUserReviewFound}
          onStatsChange={onStatsChange}
        />
        
        {/* Review Form (subscribers only, if not already reviewed) */}
        {isSubscriber && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            {userHasReviewed ? (
              <div className="flex items-center gap-3 py-3 px-4 bg-primary/5 rounded-xl">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  Thanks for sharing your review! Your feedback helps other crafters.
                </p>
              </div>
            ) : (
              <ReviewForm assetId={assetId} onReviewSubmitted={handleReviewSubmitted} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
