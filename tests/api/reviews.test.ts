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
        mockAll.mockResolvedValue({ results: [{ id: 1, rating: 5 }] });
        // Mock avg result
        mockFirst.mockResolvedValue({ avg_rating: 5, count: 1 });

        const res = await app.request("http://localhost/123", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { reviews: unknown[] };
        expect(data.reviews).toHaveLength(1);
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

    it("DELETE /:id should delet own review", async () => {
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
});
