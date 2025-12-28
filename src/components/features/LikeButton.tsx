import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LikeButtonProps {
  assetId: string;
  initialLiked?: boolean;
  className?: string;
  variant?: "icon" | "button";
}

export function LikeButton({ assetId, initialLiked = false, className, variant = "button" }: LikeButtonProps) {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  // If we don't have initial state, we might want to check it?
  // For now rely on passed state or assume false until clicked/updates.
  // Ideally, parent passes initialLiked from a fetched list.
  
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a link
    e.stopPropagation();

    if (!isSignedIn) {
      toast.error("Please sign in to like designs");
      return;
    }

    setLoading(true);
    // Optimistic update
    const previousState = liked;
    setLiked(!liked);

    try {
      const res = await apiClient.user.toggleLike(assetId);
      setLiked(res.liked);
      toast.success(res.liked ? "Added to favorites" : "Removed from favorites");
      
      // Invalidate user likes cache so dashboard updates
      queryClient.invalidateQueries({ queryKey: ['user', 'likes'] });
    } catch (error) {
      setLiked(previousState); // Revert
      toast.error("Failed to update favorite");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button 
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:border-rose-100 hover:shadow-md",
          liked ? "bg-rose-50 text-rose-500 hover:bg-rose-100" : "bg-white text-gray-400 hover:bg-rose-50 hover:text-rose-500",
          className
        )}
        title={liked ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={cn("w-5 h-5", liked && "fill-current")} strokeWidth={liked ? 0 : 2} />
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "gap-2",
        liked && "text-rose-600 border-rose-200 bg-rose-50",
        className
      )}
    >
      <Heart className={cn("w-4 h-4", liked && "fill-current")} />
      {liked ? "Liked" : "Like"}
    </Button>
  );
}
