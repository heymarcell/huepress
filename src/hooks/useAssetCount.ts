import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useAssetCount() {
  const { data } = useQuery({
    queryKey: ['asset-count'],
    queryFn: () => apiClient.assets.list({ limit: 1 }), // Minimal fetch to get total
    staleTime: 60 * 60 * 1000, // Cache for 1 hour (count doesn't change rapidly)
  });

  const total = data?.total || 0;
  
  // Logic: Round down to nearest 100
  // e.g. 811 -> 800
  // e.g. 952 -> 900
  // e.g. 1050 -> 1000
  const rounded = Math.floor(total / 100) * 100;

  // Fallback to "500+" if something hasn't loaded or count is low, 
  // but user request implies we update specifically for larger numbers.
  // If count < 500, maybe standard showing exact number or sticking to a baseline?
  // Let's assume we want to show the accurate floor-rounded number if > 100.
  // If total is 0 or low, fallback to "500+" to avoid "0+" on loading/error?
  // Actually, let's defaults to "500+" if loading to prevent layout shift of "0+".
  
  if (!data) return "500+";

  // If we have less than 500 (e.g. dev env), just show "500+" to maintain marketing copy?
  // Or show accurate? The user said "since now we have 811...".
  // I'll stick to dynamic strictly.
  
  return `${rounded}+`;
} 
