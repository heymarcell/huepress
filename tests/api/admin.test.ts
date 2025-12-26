import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

// Mock the OG generator to avoid WASM loading in tests
vi.mock("../../src/lib/og-generator", () => ({
  generateOgImage: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  arrayBufferToBase64: vi.fn().mockReturnValue("base64data"),
}));

vi.mock("@cloudflare/containers", () => ({
  getContainer: vi.fn().mockReturnValue({
    fetch: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true, results: {}, elapsedMs: 100 }),
      text: vi.fn().mockResolvedValue("OK"),
    }),
  }),
}));

import app from "../../src/api/routes/admin";

describe("Admin API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockRun: Mock;
    let mockFirst: Mock;
    let mockEnv: Record<string, unknown>;
    let mockR2Put: Mock;
    
    beforeEach(() => {
        mockAll = vi.fn();
        mockRun = vi.fn();
        mockFirst = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        mockR2Put = vi.fn();
        
        const mockStatement = {
            all: mockAll,
            run: mockRun,
            first: mockFirst,
            bind: mockBind
        };
        mockBind.mockReturnValue(mockStatement);
        mockPrepare.mockReturnValue(mockStatement);

        mockEnv = {
            DB: { prepare: mockPrepare },
            ASSETS_PUBLIC: { put: mockR2Put },
            ASSETS_PRIVATE: { put: mockR2Put },
            ASSETS_CDN_URL: "https://assets.test",
            ADMIN_EMAILS: "admin@test.com",
            PROCESSING: {}, // Mock Service Binding
            INTERNAL_API_TOKEN: "test-token"
        };
    });

    it("GET /assets should return unauthorized without header", async () => {
        const res = await app.request("http://localhost/assets", {}, mockEnv);
        expect(res.status).toBe(401);
    });

    it("GET /assets should return assets if authorized", async () => {
        mockAll.mockResolvedValue({ results: [] });
        const res = await app.request("http://localhost/assets", {
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        expect(res.status).toBe(200);
    });

    it("POST /assets should create asset", async () => {
        const formData = new FormData();
        formData.append("title", "Test Asset");
        formData.append("description", "Desc");
        formData.append("category", "Animals");
        formData.append("skill", "Easy");
        formData.append("tags", "tag1, tag2");
        formData.append("status", "draft");
        formData.append("thumbnail", new File([""], "thumb.png", { type: "image/png" }));
        formData.append("pdf", new File([""], "file.pdf", { type: "application/pdf" }));

        // Mock DB calls for ID generation
        const mockLastAsset = { asset_id: "HP-ANM-0001" };
        mockFirst
           .mockResolvedValueOnce(mockLastAsset) // Last asset
           .mockResolvedValueOnce(undefined); // Unused

        const mockExecutionCtx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
        };

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            headers: { "X-Admin-Email": "admin@test.com" },
            body: formData
        }, mockEnv, mockExecutionCtx as any); // Pass executionCtx

        expect(res.status).toBe(200);
        expect(mockR2Put).toHaveBeenCalledTimes(2); // Thumb + PDF (OG is async container)
        expect(mockRun).toHaveBeenCalled(); // Insert
    });

    it("GET /assets/:id should return single asset", async () => {
        const mockAsset = { id: "123", title: "Test", tags: '["tag1"]' };
        mockFirst.mockResolvedValue(mockAsset);
        
        const res = await app.request("http://localhost/assets/123", {
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { asset: { title: string } };
        expect(data.asset).toHaveProperty("title", "Test");
    });

    it("GET /assets/:id should return 404 for unknown asset", async () => {
        mockFirst.mockResolvedValue(null);
        
        const res = await app.request("http://localhost/assets/unknown", {
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("PATCH /assets/:id/status should update asset status", async () => {
        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { 
                "X-Admin-Email": "admin@test.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        expect(mockRun).toHaveBeenCalled();
    });

    it("DELETE /assets/:id should delete asset", async () => {
        mockFirst.mockResolvedValue({ id: "123", r2_key_private: "file.pdf" });
        
        const mockR2Delete = vi.fn();
        mockEnv.ASSETS_PRIVATE = { ...mockEnv.ASSETS_PRIVATE as object, delete: mockR2Delete };
        mockEnv.ASSETS_PUBLIC = { ...mockEnv.ASSETS_PUBLIC as object, delete: mockR2Delete };
        
        const res = await app.request("http://localhost/assets/123", {
            method: "DELETE",
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(200);
        expect(mockRun).toHaveBeenCalled();
    });

    it("DELETE /assets/:id should return 404 for unknown asset", async () => {
        mockFirst.mockResolvedValue(null);
        
        const res = await app.request("http://localhost/assets/unknown", {
            method: "DELETE",
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("should reject non-admin users", async () => {
        const res = await app.request("http://localhost/assets", {
            headers: { "X-Admin-Email": "notadmin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(401);
    });

    it("POST /create-draft should create draft asset", async () => {
        // Mock sequence insert/update
        mockFirst.mockResolvedValue({ value: 1 });
        
        const formData = new FormData();
        formData.append("title", "Draft Test");
        formData.append("category", "Animals");
        formData.append("description", "Test desc");
        formData.append("skill", "Easy");
        formData.append("tags", "cute, animal");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            headers: { "X-Admin-Email": "admin@test.com" },
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(200);
        expect(mockRun).toHaveBeenCalled();
    });

    it("POST /create-draft should require title", async () => {
        const formData = new FormData();
        formData.append("category", "Animals");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            headers: { "X-Admin-Email": "admin@test.com" },
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /create-draft should require category", async () => {
        const formData = new FormData();
        formData.append("title", "Test Title");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            headers: { "X-Admin-Email": "admin@test.com" },
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("PATCH /assets/:id/status should reject invalid status", async () => {
        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { 
                "X-Admin-Email": "admin@test.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "invalid" })
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("PATCH /assets/:id/status should accept 'draft' status", async () => {
        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { 
                "X-Admin-Email": "admin@test.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "draft" })
        }, mockEnv);
        
        expect(res.status).toBe(200);
    });

    it("GET /assets should parse tags as JSON array", async () => {
        mockAll.mockResolvedValue({ results: [
            { id: "1", title: "Test", tags: '["cute","animal"]' }
        ] });
        
        const res = await app.request("http://localhost/assets", {
            headers: { "X-Admin-Email": "admin@test.com" }
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { assets: { tags: string[] }[] };
        expect(data.assets[0].tags).toEqual(["cute", "animal"]);
    });
});
