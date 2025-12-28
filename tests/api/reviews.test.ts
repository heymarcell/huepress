import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/reviews";

describe("Reviews API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockFirst: Mock;
    let mockRun: Mock;
    let mockEnv: Record<string, unknown>;
    
    // Mock getAuth
    vi.mock("@hono/clerk-auth", () => ({
        getAuth: vi.fn(() => ({ userId: "user_123" }))
    }));

    beforeEach(() => {
        mockAll = vi.fn();
        mockFirst = vi.fn();
        mockRun = vi.fn();
        mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst, run: mockRun });
        mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
        
        mockEnv = {
            DB: {
                prepare: mockPrepare
            }
        };
    });

    it("GET /:assetId should return reviews and stats", async () => {
        // Mock combined query result (legacy/current behavior)
        // OR optimized behavior (Separate queries)
        // We are writing the test for the OPTIMIZED behavior directly to save steps.
        
        // 1. Mock List Query
        const mockReviews = [
            { id: "r1", rating: 5, comment: "Great", user_email: "test@example.com", created_at: "2023-01-01" }
        ];
        
        // 2. Mock Stats Query
        const mockStats = { avg_rating: 4.5, total_count: 10 };

        // We expect Promise.all, so distinct DB calls.
        // We can mock `all` for list and `first` for stats.
        // Or if we use `all` for both...
        
        // Let's rely on call order or inspect arguments.
        // But simpler: just populate what `c.env.DB.prepare` returns.
        
        // If we implement separate queries:
        // 1. SELECT ... FROM reviews ... (Get list)
        // 2. SELECT AVG(rating)... (Get stats)
        
        // We can use `mockImplementation` on `prepare` to return different mocks based on query string,
        // but that's brittle.
        // Instead, valid sequential returns:
        mockAll.mockResolvedValue({ results: mockReviews }); // List
        mockFirst.mockResolvedValue(mockStats); // Stats
        
        const res = await app.request("http://localhost/asset_1", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { reviews: unknown[]; averageRating: number; totalReviews: number };
        expect(data.reviews).toHaveLength(1);
        expect(data.averageRating).toBe(4.5);
        expect(data.totalReviews).toBe(10);
    });

    it("GET /:assetId should handle empty reviews", async () => {
        mockAll.mockResolvedValue({ results: [] });
        mockFirst.mockResolvedValue({ avg_rating: null, total_count: 0 });

        const res = await app.request("http://localhost/asset_1", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { reviews: unknown[]; averageRating: number | null; totalReviews: number };
        expect(data.reviews).toHaveLength(0);
        expect(data.averageRating).toBeNull();
        expect(data.totalReviews).toBe(0);
    });
});
