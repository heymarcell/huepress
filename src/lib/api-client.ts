import { Asset, Tag } from "@/api/types";

// Helper to get base URL
const API_URL = import.meta.env.VITE_API_URL || "/api"; // Default to relative proxy in dev

// Types
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}


// Private helper for fetch
async function fetchApi<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  // Handle absolute vs relative path for API
  // In dev (vite) we use proxy (relative /api). In prod we might use absolute URL.
  // Ideally, VITE_API_URL should be set in prod.
  // If API_URL is full URL, path should be appended.
  // If API_URL is /api, path should be appended.
  
  // Clean up path slashes
  const cleanBase = API_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Note: If cleanPath starts with /api and cleanBase is /api, we get /api/api...
  // The API_URL usually is "http://worker..." (no /api suffix) OR we just assume paths passed here
  // are relative to API root?
  // Our backend routes are like `/api/assets`.
  // If `VITE_API_URL` is "http://localhost:8787", then we need `http://localhost:8787/api/assets`.
  // If `VITE_API_URL` is "" (vite proxy), then we need `/api/assets`.
  
  const url = `${cleanBase}${cleanPath}`;
  
  // If path already includes /api and base includes /api, dedupe?
  // Simple check: if path starts with /api, use it as is combined with origin if needed.
  // Let's assume input path includes `/api` prefix to be safe/explicit, matching backend routes.

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json() as T & { error?: string };
  } catch (_e) {
    // If JSON parse fails, it might be a text error or HTML (500)
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const apiClient = {
  assets: {
    list: async (params?: { category?: string; skill?: string; tag?: string; search?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append("category", params.category);
      if (params?.skill) searchParams.append("skill", params.skill);
      if (params?.tag) searchParams.append("tag", params.tag);
      if (params?.search) searchParams.append("search", params.search);
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.offset) searchParams.append("offset", params.offset.toString());
      
      const queryString = searchParams.toString();
      return fetchApi<{ assets: Asset[], total: number, limit: number, offset: number, count: number }>(`/api/assets?${queryString}`);
    },
    get: async (id: string) => {
      return fetchApi<Asset>(`/api/assets/${id}`);
    },
    getDownloadUrl: (id: string) => {
       // Just returns the URL, logic handled by browser/component usually
       const cleanBase = API_URL.replace(/\/$/, "");
       return `${cleanBase}/api/download/${id}`;
    },
    fetchDownloadBlob: async (id: string, token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/download/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      return response.blob();
    }
  },
  tags: {
    list: async (type?: string) => {
      const path = type ? `/api/tags?type=${type}` : "/api/tags";
      return fetchApi<{ tags: Tag[]; grouped: Record<string, Tag[]> }>(path);
    }
  },
  admin: {
    listAssets: async (token: string) => {
      return fetchApi<{ assets: Asset[] }>("/api/admin/assets", {
        token
      });
    },
    createAsset: async (formData: FormData, token: string) => {
      // Form data requires special handling (no Content-Type header, let browser set boundary)
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to create asset");
      return data;
    },
    getStats: async (token: string) => {
      return fetchApi<{
        totalAssets: number;
        totalDownloads: number;
        totalSubscribers: number;
        newAssetsThisWeek: number;
      }>("/api/admin/stats", {
        token
      });
    },
    createDraft: async (formData: { title: string; description: string; category: string; skill: string; tags: string }, token: string) => {
      const form = new FormData();
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("skill", formData.skill);
      form.append("tags", formData.tags);
      
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/create-draft`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`
        },
        body: form
      });
      
      const data = await response.json() as { assetId?: string; slug?: string; id?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to create draft");
      }
      return data as { assetId: string; slug: string; id: string };
    },
    deleteAsset: async (id: string, token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to delete asset");
      }
      return data;
    },
    bulkDeleteAssets: async (ids: string[], token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/bulk-delete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
      });
      const data = await response.json() as { success?: boolean; deletedCount?: number; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to delete assets");
      }
      return data;
    },
    getAsset: async (id: string, token: string) => {
      return fetchApi<{ asset?: Record<string, unknown> }>(`/api/admin/assets/${id}`, {
        token
      }).then(data => data.asset);
    },
    getAssetSource: async (id: string, token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}/source`, {
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch asset source");
      }
      return response.blob();
    },
    updateStatus: async (id: string, status: 'published' | 'draft', token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json() as { success?: boolean; status?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to update status");
      }
    return data;
    },
    regenerateOg: async (id: string, token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}/regenerate-og`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to regenerate OG image");
      }
      return data;
    },
    bulkRegenerate: async (ids: string[], token: string) => {
      return apiClient.admin.bulkRegenerateAssets(ids, token);
    },
    bulkRegenerateAssets: async (ids: string[], token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/bulk-regenerate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
      });
      const data = await response.json() as { success?: boolean; queuedCount?: number; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to queue regeneration");
      }
      return data;
    },
    bulkUpdateStatus: async (ids: string[], status: 'published' | 'draft', token: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/bulk-status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids, status })
      });
      const data = await response.json() as { success?: boolean; updatedCount?: number; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to update status");
      }
      return data;
    },
    getProcessingStatus: async (id: string, token: string) => {
      return fetchApi<{
        hasActiveJob: boolean;
        job: {
          id: string;
          status: string;
          jobType: string;
          errorMessage: string | null;
          createdAt: string;
          startedAt: string | null;
          completedAt: string | null;
        } | null;
        files: {
          thumbnail: boolean;
          pdf: boolean;
          og: boolean;
        };
      }>(`/api/admin/assets/${id}/processing-status`, {
        token
      });
    },
    listRequests: async (status?: string) => {
      // TODO: Pass token from auth context properly. For now using hardcoded header in component or assuming public?
      // Wait, the component was passing X-Admin-Email.
      // The backend `admin.ts` `verifyAdmin` relies on Clerk.
      // So we should pass the token.
      
      const token = await window.Clerk?.session?.getToken();
      const query = status && status !== 'all' ? `?status=${status}` : '';
      return fetchApi<{ requests: unknown[]; total: number }>(`/api/admin/requests${query}`, {
        token
      });
    },
    updateRequestStatus: async (id: string, status: string) => {
      const token = await window.Clerk?.session?.getToken();
      return fetchApi<{ success: boolean }>(`/api/admin/requests/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status })
      });
    }
  },
  billing: {
    createCheckout: async (priceId: string, token: string, email?: string) => {
      // Extract Meta cookies for enhanced Event Match Quality (browser → server)
      const getCookie = (name: string): string | undefined => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : undefined;
      };
      
      const fbp = getCookie('_fbp');  // Facebook browser ID
      
      // Facebook Click ID (fbc) - Priority: Cookie > URL Parameter > undefined
      let fbc = getCookie('_fbc');
      
      // If cookie is missing but we have fbclid in the URL, construct fbc manually
      // Format: fb.1.{timestamp}.{fbclid}
      if (!fbc && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
          fbc = `fb.1.${Date.now()}.${fbclid}`;
        }
      }
                                            
      const gaCookie = getCookie('_ga'); // GA client ID cookie
      
      // Generate event_id for browser/server deduplication
      // This same ID should be used for GTM dataLayer events and server CAPI
      const eventId = crypto.randomUUID ? crypto.randomUUID() : 
        `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Push begin_checkout event to dataLayer with event_id for GTM deduplication
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'begin_checkout',
          eventID: eventId, // Meta Pixel uses camelCase
          event_id: eventId, // Pinterest uses snake_case
          ecommerce: {
            value: priceId.includes('annual') ? 45 : 5,
            currency: 'USD',
            items: [{ item_id: priceId, item_name: priceId, quantity: 1 }]
          }
        });
        
        // Store eventId in sessionStorage to retrieve on success page after Stripe redirect
        sessionStorage.setItem('huepress_checkout_event_id', eventId);
        sessionStorage.setItem('huepress_checkout_value', priceId.includes('annual') ? '45' : '5');
      }
      
      return fetchApi<{ url: string }>("/api/checkout", {
        method: "POST",
        token,
        body: JSON.stringify({ priceId, email, fbp, fbc, eventId, gaCookie })
      });
    },
    createPortal: async (token: string) => {
      return fetchApi<{ url: string }>("/api/portal", {
        method: "POST",
        token
      });
    }
  },
  user: {
    getLikes: async (params?: { limit?: number; offset?: number }) => {
      const token = await window.Clerk?.session?.getToken();
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return fetchApi<{ likes: Asset[]; total: number; limit: number; offset: number }>(`/api/user/likes${query}`, {
        token
      });
    },

    getHistory: async (params?: { limit?: number; offset?: number }) => {
      const token = await window.Clerk?.session?.getToken();
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return fetchApi<{ history: (Asset & { downloaded_at: string, type: string })[]; total: number; limit: number; offset: number }>(`/api/user/history${query}`, {
        token
      });
    },
    recordActivity: async (assetId: string, type: 'download' | 'print') => {
      const token = await window.Clerk?.session?.getToken();
      return fetchApi<{ success: boolean }>(`/api/user/activity`, {
        method: "POST",
        token,
        body: JSON.stringify({ assetId, type })
      });
    },
    toggleLike: async (assetId: string) => {
      const token = await window.Clerk?.session?.getToken();
      return fetchApi<{ liked: boolean }>(`/api/user/likes/${assetId}`, {
        method: "POST",
        token
      });
    },
    getLikeStatus: async (assetId: string) => {
      const token = await window.Clerk?.session?.getToken();
      return fetchApi<{ liked: boolean }>(`/api/user/likes/${assetId}/status`, {
        token
      });
    }
  },
  reviews: {
    list: async (assetId: string) => {
      // Matches the endpoint used in ReviewList.tsx
      return fetchApi<{ reviews: { id: string; rating: number; comment?: string; created_at: string; user_email?: string }[]; averageRating: number | null; totalReviews: number }>(`/api/reviews/${assetId}`); 
    }
  },
  seo: {
    getLandingPage: async (slug: string) => {
       return fetchApi<{ 
         title: string; 
         meta_description: string; 
         intro_content: string; 
         target_keyword: string; 
         assets: Asset[];
         related: { slug: string; title: string; target_keyword: string }[];
       }>(`/api/seo/landing-pages/${slug}`);
    },
    generate: async (keyword: string) => {
       const token = await window.Clerk?.session?.getToken();
       // Using POST /api/seo/generate
       const cleanBase = API_URL.replace(/\/$/, "");
       const response = await fetch(`${cleanBase}/api/seo/generate`, {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ keyword })
       });
       
       const data = await response.json() as { success: boolean; slug?: string; url?: string; error?: string };
       if (!response.ok || data.error) {
          throw new Error(data.error || "Generation failed");
       }
       return data;
    },
    research: async (seed: string) => {
       return fetchApi<{ success: true; results: { keyword: string; source: string; score?: number }[] }>(`/api/seo/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed })
       });
    },
    list: async () => {
       const token = await window.Clerk?.session?.getToken();
       const cleanBase = API_URL.replace(/\/$/, "");
       const response = await fetch(`${cleanBase}/api/seo/landing-pages`, {
          headers: { "Authorization": `Bearer ${token}` }
       });
       const data = await response.json() as { pages: { id: string; slug: string; target_keyword: string; title: string; is_published: number; created_at: string }[]; error?: string };
       if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to list pages");
       }
       return data.pages;
    },
    deletePage: async (id: string) => {
       const token = await window.Clerk?.session?.getToken();
       const cleanBase = API_URL.replace(/\/$/, "");
       const response = await fetch(`${cleanBase}/api/seo/landing-pages/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
       });
       const data = await response.json() as { success: boolean; error?: string };
       if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to delete page");
       }
       return data;
    },
    bulkAutoGenerate: async (mode: 'priority' | 'full' = 'priority', limit: number = 50) => {
       const token = await window.Clerk?.session?.getToken();
       const cleanBase = API_URL.replace(/\/$/, "");
       const response = await fetch(`${cleanBase}/api/seo/bulk-auto-generate`, {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ mode, limit })
       });
       
       const data = await response.json() as { success: boolean; mode: string; totalGenerated: number; results: { seed: string; discovered: number; generated: number; errors: string[] }[]; error?: string };
       if (!response.ok || data.error) {
          throw new Error(data.error || "Bulk generation failed");
       }
       return data;
    }
  }
};
