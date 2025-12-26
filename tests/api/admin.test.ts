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
});
