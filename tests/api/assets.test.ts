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
            },
            ASSETS_CDN_URL: "https://assets.huepress.co"
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

    it("GET /assets should include Cache-Control header", async () => {
        mockAll.mockResolvedValue({ results: [] });
        const res = await app.request("http://localhost/assets", {}, mockEnv);
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=60, stale-while-revalidate=300");
    });

    it("GET /assets?category=animals should filter by category", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/assets?category=animals", {}, mockEnv);

        const queryArg = mockPrepare.mock.calls[0][0];
        expect(queryArg).toContain("category = ?");
    });

    it("GET /assets?skill=easy should filter by skill", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/assets?skill=easy", {}, mockEnv);

        const queryArg = mockPrepare.mock.calls[0][0];
        expect(queryArg).toContain("skill = ?");
    });

    it("GET /assets?tag=cute should filter by tag", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/assets?tag=cute", {}, mockEnv);

        const queryArg = mockPrepare.mock.calls[0][0];
        expect(queryArg).toContain("json_each(tags)");
    });

    it("GET /assets?search=dino should filter by search", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/assets?search=dino", {}, mockEnv);

        expect(mockPrepare).toHaveBeenCalled();
        // Check if query contains LIKE clauses
        const queryArg = mockPrepare.mock.calls[0][0];
        expect(queryArg).toContain("title LIKE ?");
    });

    it("GET /assets should handle null tags", async () => {
        mockAll.mockResolvedValue({ results: [{ id: "1", title: "Test", tags: null }] });

        const res = await app.request("http://localhost/assets", {}, mockEnv);
        const data = await res.json() as { assets: {tags: unknown[]}[] };
        expect(data.assets[0].tags).toEqual([]);
    });

    it("GET /assets should build CDN URL for thumbnails", async () => {
        mockAll.mockResolvedValue({ results: [{ id: "1", r2_key_public: "thumbnails/test.webp", tags: null }] });

        const res = await app.request("http://localhost/assets", {}, mockEnv);
        const data = await res.json() as { assets: {image_url: string}[] };
        expect(data.assets[0].image_url).toBe("https://assets.huepress.co/thumbnails/test.webp");
    });

    it("GET /assets should skip draft thumbnails", async () => {
        mockAll.mockResolvedValue({ results: [{ id: "1", r2_key_public: "__draft__/test.webp", tags: null }] });

        const res = await app.request("http://localhost/assets", {}, mockEnv);
        const data = await res.json() as { assets: {image_url: string | null}[] };
        expect(data.assets[0].image_url).toBeNull();
    });

    it("GET /assets should handle database error", async () => {
        mockAll.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/assets", {}, mockEnv);
        expect(res.status).toBe(500);
    });

    it("GET /assets/:id should return asset", async () => {
        const mockAsset = { id: "1", title: "Test", tags: '[]', status: 'published' };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/1", {}, mockEnv);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=60, stale-while-revalidate=300");
    });

    it("GET /assets/:id should lookup by HP- asset ID", async () => {
        const mockAsset = { id: "1", asset_id: "HP-ANM-00001", tags: '[]', status: 'published' };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/HP-ANM-00001", {}, mockEnv);
        expect(res.status).toBe(200);
        expect(mockPrepare).toHaveBeenCalledWith("SELECT * FROM assets WHERE asset_id = ?");
    });

    it("GET /assets/:id should lookup by slug with OR conditions", async () => {
        const mockAsset = { id: "1", slug: "cute-cat", tags: '[]', status: 'published' };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/cute-cat", {}, mockEnv);
        expect(res.status).toBe(200);
    });

    it("GET /assets/:id should handle numeric ID suffix lookup", async () => {
        const mockAsset = { id: "1", asset_id: "HP-ANM-12345", tags: '[]', status: 'published' };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/12345", {}, mockEnv);
        expect(res.status).toBe(200);
    });

    it("GET /assets/:id should return 404 for unpublished asset", async () => {
        mockFirst.mockResolvedValue({ id: "1", status: 'draft' });

        const res = await app.request("http://localhost/assets/1", {}, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /assets/:id should return 404 for unknown asset", async () => {
        mockFirst.mockResolvedValue(null);

        const res = await app.request("http://localhost/assets/unknown", {}, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /assets/:id should parse JSON fields", async () => {
        const mockAsset = { 
            id: "1", status: 'published',
            tags: '["cat"]',
            fun_facts: '["fact1"]',
            suggested_activities: '["activity1"]'
        };
        mockFirst.mockResolvedValue(mockAsset);

        const res = await app.request("http://localhost/assets/1", {}, mockEnv);
        const data = await res.json() as { tags: string[], fun_facts: string[], suggested_activities: string[] };
        expect(data.tags).toEqual(["cat"]);
        expect(data.fun_facts).toEqual(["fact1"]);
        expect(data.suggested_activities).toEqual(["activity1"]);
    });

    it("GET /assets/:id should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/assets/1", {}, mockEnv);
        expect(res.status).toBe(500);
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

    it("GET /download/:id should return 404 if asset not found", async () => {
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123" }))
        }));

        mockFirst
            .mockResolvedValueOnce({ subscription_status: "active" })
            .mockResolvedValueOnce(null);

        const res = await app.request("http://localhost/download/1", {
            headers: { "Authorization": "Bearer token" }
        }, mockEnv);

        expect(res.status).toBe(404);
    });

    it("GET /download/:id should return 404 if file not in R2", async () => {
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123" }))
        }));

        const mockAsset = { id: "1", r2_key_private: "key.pdf" };
        mockFirst
            .mockResolvedValueOnce({ subscription_status: "active" })
            .mockResolvedValueOnce(mockAsset);
        mockR2Get.mockResolvedValue(null);

        const res = await app.request("http://localhost/download/1", {
            headers: { "Authorization": "Bearer token" }
        }, mockEnv);

        expect(res.status).toBe(404);
    });

    it("GET /download/:id should handle download error", async () => {
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123" }))
        }));

        mockFirst
            .mockResolvedValueOnce({ subscription_status: "active" })
            .mockRejectedValueOnce(new Error("DB error"));

        const res = await app.request("http://localhost/download/1", {
            headers: { "Authorization": "Bearer token" }
        }, mockEnv);

        expect(res.status).toBe(500);
    });
});

