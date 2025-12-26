import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/assets";

describe("Assets API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockFirst: Mock;
    let mockRun: Mock;
    let mockEnv: Record<string, unknown>;
    let mockR2Get: Mock; 
    
    beforeEach(() => {
        mockAll = vi.fn();
        mockFirst = vi.fn();
        mockRun = vi.fn();
        mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst, run: mockRun });
        mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
        
        mockR2Get = vi.fn();

        mockEnv = {
            DB: {
                prepare: mockPrepare
            },
            ASSETS_PRIVATE: {
                get: mockR2Get
            }
        };
    });

    it("GET /assets should return assets list", async () => {
        const mockAssets = [{ id: "1", title: "Test", tags: '["tag1"]' }];
        mockAll.mockResolvedValue({ results: mockAssets });

        const res = await app.request("http://localhost/assets", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { assets: {tags: unknown}[], count: number };
        expect(data.assets).toHaveLength(1);
        expect(data.assets[0].tags).toEqual(["tag1"]);
    });

    it("GET /assets?search=dino should filter by search", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/assets?search=dino", {}, mockEnv);

        expect(mockPrepare).toHaveBeenCalled();
        // Check if query contains LIKE clauses
        const queryArg = mockPrepare.mock.calls[0][0];
        expect(queryArg).toContain("title LIKE ?");
    });

    it("GET /assets/:id should return asset", async () => {
        const mockAsset = { id: "1", title: "Test", tags: '[]' };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/1", {}, mockEnv);
        expect(res.status).toBe(200);
    });

    it("GET /download/:id should return file", async () => {
        // Mock getAuth from @hono/clerk-auth
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123" }))
        }));

        const mockAsset = { id: "1", title: "Test", r2_key_private: "key.pdf", slug: "test", asset_id: "HP-001" };
        
        // First call: subscription check, Second call: asset lookup
        mockFirst
            .mockResolvedValueOnce({ subscription_status: "active" }) // User subscription
            .mockResolvedValueOnce(mockAsset);
        
        mockR2Get.mockResolvedValue({ body: "file content" });

        const res = await app.request("http://localhost/download/1", {
            headers: { "Authorization": "Bearer token" }
        }, mockEnv);

        expect(res.status).toBe(200);
        expect(mockR2Get).toHaveBeenCalledWith("key.pdf");
        expect(mockRun).toHaveBeenCalled(); // Update download count
    });

    it("GET /download/:id should return 403 without active subscription", async () => {
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123" }))
        }));

        // User without active subscription
        mockFirst.mockResolvedValueOnce({ subscription_status: "free" });

        const res = await app.request("http://localhost/download/1", {
            headers: { "Authorization": "Bearer token" }
        }, mockEnv);

        expect(res.status).toBe(403);
        const data = await res.json() as { error: string };
        expect(data.error).toBe("Active subscription required");
    });
});
