import { useState } from "react";
import { useSubscription } from "@/lib/auth";
import { ReviewList } from "@/components/features/ReviewList";
import { ReviewForm } from "@/components/features/ReviewForm";

interface ReviewsSectionProps {
  assetId: string;
  stats: { 
    avg: number | null; 
    count: number 
  };
}

export function ReviewsSection({ assetId, stats }: ReviewsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isSubscriber } = useSubscription();

  const handleReviewSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-6 lg:p-8">
        <h2 className="font-serif text-h3 text-ink mb-6">
          Reviews {stats.count > 0 && <span className="text-gray-400 text-lg">({stats.count})</span>}
        </h2>
        
        {/* Review List */}
        <ReviewList assetId={assetId} refreshTrigger={refreshTrigger} />
        
        {/* Review Form (subscribers only) */}
        {isSubscriber && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <ReviewForm assetId={assetId} onReviewSubmitted={handleReviewSubmitted} />
          </div>
        )}
      </div>
    </div>
  );
}
