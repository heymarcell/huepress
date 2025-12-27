import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/user";

describe("User API", () => {
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

    it("GET /likes should return user likes", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock list query
        mockAll.mockResolvedValue({ results: [{ id: "asset_1" }] });

        const res = await app.request("http://localhost/likes", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { likes: unknown[] };
        expect(data.likes).toHaveLength(1);
    });

    it("GET /likes/:assetId/status should return true if liked", async () => {
        // Mock internal user lookup (SELECT id FROM users ...)
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock like existence lookup
        mockFirst.mockResolvedValueOnce({ 1: 1 });

        const res = await app.request("http://localhost/likes/asset_1/status", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(true);
    });

    it("GET /likes/:assetId/status should return false if not liked", async () => {
        // Mock internal user lookup
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock like existence lookup (null)
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/likes/asset_1/status", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(false);
    });
});
