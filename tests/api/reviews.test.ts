import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getAuth } from "@hono/clerk-auth";
import app from "../../src/api/routes/reviews";

vi.mock("@hono/clerk-auth", () => ({
    getAuth: vi.fn()
}));

describe("Reviews API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockRun: Mock;
    let mockFirst: Mock;

    let mockEnv: Record<string, unknown>;
    
    beforeEach(() => {
        mockAll = vi.fn();
        mockFirst = vi.fn();
        mockRun = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        
        const statement = {
            all: mockAll,
            first: mockFirst,
            run: mockRun,
            bind: mockBind
        };
        mockBind.mockReturnValue(statement);
        mockPrepare.mockReturnValue(statement);
        
        mockEnv = {
            DB: { prepare: mockPrepare }
        };
    });

    it("GET /:assetId should return reviews", async () => {
        mockAll.mockResolvedValue({ results: [{ id: 1, rating: 5, avg_rating: 5, total_count: 1 }] });

        const res = await app.request("http://localhost/123", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { reviews: unknown[] };
        expect(data.reviews).toHaveLength(1);
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=60, stale-while-revalidate=300");
    });

    it("GET /:assetId should return empty reviews", async () => {
        mockAll.mockResolvedValue({ results: [] });

        const res = await app.request("http://localhost/123", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { reviews: unknown[], averageRating: number | null, totalReviews: number };
        expect(data.reviews).toHaveLength(0);
        expect(data.averageRating).toBeNull();
        expect(data.totalReviews).toBe(0);
    });

    it("GET /:assetId should handle database error", async () => {
        mockAll.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/123", {}, mockEnv);
        expect(res.status).toBe(500);
    });

    it("POST / should create review", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        
        // Mock user lookup
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "active" });
        // Mock existing check
        mockFirst.mockResolvedValueOnce(undefined);

        const body = { asset_id: "1", rating: 5, comment: "Great" };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(201);
        expect(mockRun).toHaveBeenCalled();
    });

    it("POST / should return 401 if not authenticated", async () => {
        (getAuth as Mock).mockReturnValue(null);

        const body = { asset_id: "1", rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(401);
    });

    it("POST / should return 404 if user not found", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce(null);

        const body = { asset_id: "1", rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("POST / should return 403 if not subscriber", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "free" });

        const body = { asset_id: "1", rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(403);
    });

    it("POST / should return 400 if rating invalid", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "active" });

        const body = { asset_id: "1", rating: 6 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST / should return 400 if rating missing", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "active" });

        const body = { asset_id: "1" };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST / should return 400 if asset_id missing", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "active" });

        const body = { rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST / should return 409 if already reviewed", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1", subscription_status: "active" });
        mockFirst.mockResolvedValueOnce({ id: "existing_review" });

        const body = { asset_id: "1", rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(409);
    });

    it("POST / should handle database error", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockRejectedValue(new Error("DB error"));

        const body = { asset_id: "1", rating: 5 };
        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("DELETE /:id should delete own review", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        // Mock user lookup
        mockFirst.mockResolvedValueOnce({ id: "u1" });
        // Mock delete result
        mockRun.mockReturnValue({ meta: { changes: 1 } });

        const res = await app.request("http://localhost/r1", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(200);
        expect(mockRun).toHaveBeenCalled();
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM reviews"));
    });

    it("DELETE /:id should return 401 if not authenticated", async () => {
        (getAuth as Mock).mockReturnValue(null);

        const res = await app.request("http://localhost/r1", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(401);
    });

    it("DELETE /:id should return 404 if user not found", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/r1", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("DELETE /:id should return 404 if review not found or not owned", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockResolvedValueOnce({ id: "u1" });
        mockRun.mockReturnValue({ meta: { changes: 0 } });

        const res = await app.request("http://localhost/r1", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("DELETE /:id should handle database error", async () => {
        (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
        mockFirst.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/r1", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });
});

