import { Asset, Tag } from "@/api/types";

// Helper to get base URL
const API_URL = import.meta.env.VITE_API_URL || "/api"; // Default to relative proxy in dev

// Types


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

  const data = await response.json() as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "API Request Failed");
  }

  return data as T;
}

export const apiClient = {
  assets: {
    list: async (params?: { category?: string; skill?: string; tag?: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append("category", params.category);
      if (params?.skill) searchParams.append("skill", params.skill);
      if (params?.tag) searchParams.append("tag", params.tag);
      if (params?.search) searchParams.append("search", params.search);
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      
      const queryString = searchParams.toString();
      return fetchApi<{ assets: Asset[], count: number }>(`/api/assets?${queryString}`);
    },
    get: async (id: string) => {
      return fetchApi<Asset>(`/api/assets/${id}`);
    },
    getDownloadUrl: (id: string) => {
       // Just returns the URL, logic handled by browser/component usually
       const cleanBase = API_URL.replace(/\/$/, "");
       return `${cleanBase}/api/download/${id}`;
    }
  },
  tags: {
    list: async (type?: string) => {
      const path = type ? `/api/tags?type=${type}` : "/api/tags";
      return fetchApi<{ tags: Tag[]; grouped: Record<string, Tag[]> }>(path);
    }
  },
  admin: {
    listAssets: async (adminEmail: string) => {
      return fetchApi<{ assets: Asset[] }>("/api/admin/assets", {
        headers: { "X-Admin-Email": adminEmail }
      });
    },
    createAsset: async (formData: FormData, adminEmail: string) => {
      // Form data requires special handling (no Content-Type header, let browser set boundary)
      const headers: Record<string, string> = {
        "X-Admin-Email": adminEmail
      };
      
      // We don't use fetchApi helper here because we need custom body handling
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to create asset");
      return data;
    },
    getStats: async (adminEmail: string) => {
      return fetchApi<{
        totalAssets: number;
        totalDownloads: number;
        totalSubscribers: number;
        newAssetsThisWeek: number;
      }>("/api/admin/stats", {
        headers: { "X-Admin-Email": adminEmail }
      });
    },
    createDraft: async (formData: { title: string; description: string; category: string; skill: string; tags: string }, adminEmail: string) => {
      const form = new FormData();
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("skill", formData.skill);
      form.append("tags", formData.tags);
      
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/create-draft`, {
        method: "POST",
        headers: { "X-Admin-Email": adminEmail },
        body: form
      });
      
      const data = await response.json() as { assetId?: string; slug?: string; id?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to create draft");
      }
      return data as { assetId: string; slug: string; id: string };
    },
    deleteAsset: async (id: string, adminEmail: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Email": adminEmail }
      });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to delete asset");
      }
      return data;
    },
    bulkDeleteAssets: async (ids: string[], adminEmail: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/bulk-delete`, {
        method: "POST",
        headers: { 
          "X-Admin-Email": adminEmail,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids })
      });
      const data = await response.json() as { success?: boolean; deletedCount?: number; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to delete assets");
      }
      return data;
    },
    getAsset: async (id: string, adminEmail: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}`, {
        headers: { "X-Admin-Email": adminEmail }
      });
      const data = await response.json() as { asset?: Record<string, unknown>; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch asset");
      }
      return data.asset;
    },
    getAssetSource: async (id: string, adminEmail: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}/source`, {
        headers: { "X-Admin-Email": adminEmail }
      });
      if (!response.ok) {
        // partial success (no source found) is common for old assets, don't throw, just return null?
        // But for regeneration we need it. Let's throw if it's strictly not found when we expect it.
        // Or return null to safe handle.
        if (response.status === 404) return null;
        throw new Error("Failed to fetch asset source");
      }
      return response.blob();
    },
    updateStatus: async (id: string, status: 'published' | 'draft', adminEmail: string) => {
      const cleanBase = API_URL.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/api/admin/assets/${id}/status`, {
        method: "PATCH",
        headers: { 
          "X-Admin-Email": adminEmail,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json() as { success?: boolean; status?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to update status");
      }
      return data;
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
      const fbc = getCookie('_fbc');  // Facebook click ID (from ad clicks)
      
      return fetchApi<{ url: string }>("/api/checkout", {
        method: "POST",
        token,
        body: JSON.stringify({ priceId, email, fbp, fbc })
      });
    },
    createPortal: async (token: string) => {
      return fetchApi<{ url: string }>("/api/portal", {
        method: "POST",
        token
      });
    }
  }
};
