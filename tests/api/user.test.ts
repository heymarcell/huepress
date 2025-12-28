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
            },
            ASSETS_CDN_URL: "https://assets.huepress.co"
        };
        
        // Stub global crypto for tests
        vi.stubGlobal('crypto', {
            randomUUID: () => "test-uuid-1234"
        });
    });

    it("GET /likes should return user likes", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock list query
        mockAll.mockResolvedValue({ results: [{ id: "asset_1" }] });
        // Mock count query
        mockFirst.mockResolvedValueOnce({ total: 1 });

        const res = await app.request("http://localhost/likes", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { likes: unknown[]; total: number };
        expect(data.likes).toHaveLength(1);
        expect(data.total).toBe(1);
    });

    it("GET /likes should return 404 if user not found", async () => {
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/likes", {}, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /likes/:assetId/status should return true if liked", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock single check query result
        mockFirst.mockResolvedValueOnce({ 1: 1 });

        const res = await app.request("http://localhost/likes/asset_1/status", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(true);
    });

    it("GET /likes/:assetId/status should return false if not liked", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock single check query result (null)
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/likes/asset_1/status", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(false);
    });

    it("GET /likes/:assetId/status should return false if user not found", async () => {
        // Mock getDbUser (null)
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/likes/asset_1/status", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(false);
    });

    it("POST /likes/:assetId should unlike if already liked", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock existing like check
        mockFirst.mockResolvedValueOnce({ id: "like_123" });
        mockRun.mockResolvedValue({ meta: { changes: 1 } });

        const res = await app.request("http://localhost/likes/asset_1", { method: "POST" }, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(false);
    });

    it("POST /likes/:assetId should like if not already liked", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock existing like check - null means not liked
        mockFirst.mockResolvedValueOnce(null);
        mockRun.mockResolvedValue({ meta: { changes: 1 } });

        const res = await app.request("http://localhost/likes/asset_1", { method: "POST" }, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { liked: boolean };
        expect(data.liked).toBe(true);
    });

    it("POST /likes/:assetId should return 404 if user not found", async () => {
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/likes/asset_1", { method: "POST" }, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /history should return download history", async () => {
        // Mock getDbUser
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        // Mock history query
        mockAll.mockResolvedValue({ 
            results: [{ 
                id: "download_1", 
                type: "download",
                r2_key_public: "thumbnails/test.webp",
                tags: '["animals"]'
            }] 
        });
        // Mock count query
        mockFirst.mockResolvedValueOnce({ total: 1 });

        const res = await app.request("http://localhost/history", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { history: unknown[]; total: number };
        expect(data.history).toHaveLength(1);
        expect(data.total).toBe(1);
    });

    it("GET /history should return 404 if user not found", async () => {
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/history", {}, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /history should handle draft thumbnails", async () => {
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        mockAll.mockResolvedValue({ 
            results: [{ 
                id: "download_1", 
                r2_key_public: "__draft__/test.webp",
                tags: null
            }] 
        });
        mockFirst.mockResolvedValueOnce({ total: 1 });

        const res = await app.request("http://localhost/history", {}, mockEnv);
        expect(res.status).toBe(200);
        const data = await res.json() as { history: { image_url: string | undefined }[] };
        expect(data.history[0].image_url).toBeUndefined();
    });

    it.skip("POST /activity should record download", async () => {
        mockFirst.mockResolvedValueOnce({ id: "db_user_123" });
        mockRun.mockResolvedValue({ meta: { changes: 1 } });

        const mockExecutionCtx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
        };

        const res = await app.request("http://localhost/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetId: "asset_1", type: "download" })
        }, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { success: boolean; id: string };
        expect(data.success).toBe(true);
        expect(data.id).toBeDefined();
    });

    it("POST /activity should return 400 if missing fields", async () => {
        const res = await app.request("http://localhost/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetId: "asset_1" }) // Missing type
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /activity should return 404 if user not found", async () => {
        mockFirst.mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetId: "asset_1", type: "download" })
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });
});

