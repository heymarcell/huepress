import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { ExecutionContext } from "hono";

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

vi.mock("@hono/clerk-auth", () => ({
  getAuth: vi.fn(),
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => await next(),
}));

import { getAuth } from "@hono/clerk-auth";

import app from "../../src/api/routes/admin";

describe("Admin API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockRun: Mock;
    let mockBatch: Mock;
    let mockFirst: Mock;
    let mockEnv: Record<string, unknown>;
    let mockR2Put: Mock;
    let mockR2Get: Mock;
    let mockR2Delete: Mock;
    
    let mockGetAuth: Mock;
    
    beforeEach(() => {
        mockAll = vi.fn();
        mockRun = vi.fn();
        mockFirst = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        mockBatch = vi.fn().mockResolvedValue([]);
        mockR2Put = vi.fn().mockResolvedValue(undefined); // R2 put returns promise
        mockR2Get = vi.fn().mockResolvedValue(null);
        mockR2Delete = vi.fn().mockResolvedValue(undefined);
        mockGetAuth = getAuth as unknown as Mock;
        // Mock admin user with publicMetadata.role = 'admin'
        mockGetAuth.mockReturnValue({ 
            userId: "user_admin",
            sessionClaims: { publicMetadata: { role: 'admin' } }
        });

        // Setup DB Mock Chain
        const mockStatement = {
            all: mockAll,
            run: mockRun,
            first: mockFirst,
            bind: mockBind
        };
        mockBind.mockReturnValue(mockStatement);
        mockPrepare.mockReturnValue(mockStatement);
        
        mockEnv = {
            DB: {
                prepare: mockPrepare,
                batch: mockBatch
            },
            ASSETS_PUBLIC: { put: mockR2Put, get: mockR2Get, delete: mockR2Delete },
            ASSETS_PRIVATE: {
                put: mockR2Put,
                get: mockR2Get,
                delete: mockR2Delete
            },
            ASSETS_CDN_URL: "https://assets.test",
            PROCESSING: {}, // Mock Service Binding
            INTERNAL_API_TOKEN: "test-token"
        };
    });

    it("GET /assets should return unauthorized if not admin", async () => {
        // Mock non-admin user (no role in publicMetadata)
        mockGetAuth.mockReturnValue({ 
            userId: "user_notadmin",
            sessionClaims: { publicMetadata: {} }
        });
        const res = await app.request("http://localhost/assets", {}, mockEnv);
        expect(res.status).toBe(401);
    });

    it("GET /assets should return assets if authorized", async () => {
        // Admin is already set in beforeEach
        mockAll.mockResolvedValue({ results: [] });
        const res = await app.request("http://localhost/assets", {
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
            props: {},
        } as ExecutionContext;

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData
        }, mockEnv, mockExecutionCtx); // Pass executionCtx

        expect(res.status).toBe(200);
        expect(mockR2Put).toHaveBeenCalledTimes(2); // Thumb + PDF
        // Expect 2 DB writes: 1. INSERT (Pending), 2. UPDATE (Active)
        expect(mockRun).toHaveBeenCalledTimes(2); 
    });

    it("POST /assets should not insert duplicate pending job", async () => {
        const formData = new FormData();
        formData.append("title", "Test Duplicate");
        formData.append("description", "Desc");
        formData.append("category", "animals");
        formData.append("tags", "tag1");
        formData.append("license", "standard");
        formData.append("source", new File(["<svg></svg>"], "test.svg", { type: "image/svg+xml" }));

        // Mock queries:
        // 1. SELECT lastAsset -> { asset_id: 'HP-ANIM-0001' }
        // 2. SELECT queue check -> EXISTING JOB
        mockFirst
            .mockResolvedValueOnce({ asset_id: 'HP-ANIM-0001' }) // lastAsset check
            .mockResolvedValueOnce({ id: 'existing-job' }); // Queue existing check

        const mockExecutionCtx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
        } as unknown as ExecutionContext;

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData,
            headers: { "Authorization": "Bearer test-token" }
        }, mockEnv, mockExecutionCtx);

        if (res.status === 500) {
            const err = await res.json();
            console.error("DEBUG TEST ERROR:", err);
        }
        expect(res.status).toBe(200);
        
        // Verify prepare was NOT called with INSERT INTO processing_queue
        const prepareCalls = mockPrepare.mock.calls.map(c => c[0]);
        const queueInsertStr = "INSERT INTO processing_queue";
        const hasQueueInsert = prepareCalls.some((sql: string) => sql.includes(queueInsertStr));
        
        expect(hasQueueInsert).toBe(false);
    });

    it("POST /assets should rollback DB on upload failure", async () => {
        const formData = new FormData();
        formData.append("title", "Rollback Test");
        formData.append("category", "Animals");
        formData.append("thumbnail", new File([""], "thumb.png", { type: "image/png" }));

        mockFirst
           .mockResolvedValueOnce(undefined); // New asset (no existing)

        // Mock Insert Success
        mockRun.mockResolvedValue(undefined);

        // Mock R2 Failure
        mockR2Put.mockRejectedValue(new Error("R2 Error"));

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData
        }, mockEnv);

        expect(res.status).toBe(500);
        
        // Verify Rollback: Insert -> Delete
        // mockRun called for INSERT, then called for DELETE
        expect(mockRun).toHaveBeenCalledTimes(2);
        
        // Verify DELETE query passed
        // 0: Check, 1: Insert, 2: Delete
        // Actually mockPrepare calls:
        // 1. SELECT id (Check existing)
        // 2. INSERT (Pending)
        // 3. DELETE (Rollback)
        
        // Let's check the SQL of the last prepare
        const deleteQuery = mockPrepare.mock.calls[mockPrepare.mock.calls.length - 1][0];
        expect(deleteQuery).toContain("DELETE FROM assets");
    });

    it("GET /assets/:id should return single asset", async () => {
        const mockAsset = { id: "123", title: "Test", tags: '["tag1"]' };
        mockFirst.mockResolvedValueOnce(mockAsset);
        
        const res = await app.request("http://localhost/assets/123", {
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { asset: { title: string } };
        expect(data.asset).toHaveProperty("title", "Test");
    });

    it("GET /assets/:id should return 404 for unknown asset", async () => {
        mockFirst.mockResolvedValueOnce(null);
        
        const res = await app.request("http://localhost/assets/unknown", {
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("PATCH /assets/:id/status should update asset status", async () => {

        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        expect(mockRun).toHaveBeenCalled();
    });

    it("DELETE /assets/:id should delete asset", async () => {
        mockFirst.mockResolvedValueOnce({ id: "123", r2_key_private: "file.pdf" });
        
        const localMockR2Delete = vi.fn();
        mockEnv.ASSETS_PRIVATE = { ...mockEnv.ASSETS_PRIVATE as object, delete: localMockR2Delete };
        mockEnv.ASSETS_PUBLIC = { ...mockEnv.ASSETS_PUBLIC as object, delete: localMockR2Delete };
        
        const res = await app.request("http://localhost/assets/123", {
            method: "DELETE",
        }, mockEnv);
        
        expect(res.status).toBe(200);
        // The delete route uses DB.batch() for cascading deletes
        expect(mockBatch).toHaveBeenCalled();
    });

    it("DELETE /assets/:id should return 404 for unknown asset", async () => {
        mockFirst.mockResolvedValueOnce(null);
        
        const res = await app.request("http://localhost/assets/unknown", {
            method: "DELETE",
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("should reject non-admin users", async () => {
        // Mock non-admin user
        mockGetAuth.mockReturnValue({ 
            userId: "user_random",
            sessionClaims: { publicMetadata: { role: 'user' } }
        });
        
        const res = await app.request("http://localhost/assets", {
        }, mockEnv);
        
        expect(res.status).toBe(401);
        
        // Reset to admin for subsequent tests
        mockGetAuth.mockReturnValue({ 
            userId: "user_admin",
            sessionClaims: { publicMetadata: { role: 'admin' } }
        });
    });

    it("POST /create-draft should create draft asset", async () => {
        // Mock sequence insert/update
        mockFirst.mockResolvedValueOnce({ value: 1 });
        
        const formData = new FormData();
        formData.append("title", "Draft Test");
        formData.append("category", "Animals");
        formData.append("description", "Test desc");
        formData.append("skill", "Easy");
        formData.append("tags", "cute, animal");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
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
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /create-draft should require category", async () => {
        const formData = new FormData();
        formData.append("title", "Test Title");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("PATCH /assets/:id/status should reject invalid status", async () => {
        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { 
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
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { assets: { tags: string[] }[] };
        expect(data.assets[0].tags).toEqual(["cute", "animal"]);
    });

    it("GET /stats should return dashboard statistics", async () => {
        mockFirst
            .mockResolvedValueOnce({ count: 100 }) // total assets
            .mockResolvedValueOnce({ count: 5000 })  // total downloads (SUM)
            .mockResolvedValueOnce({ count: 10 }) // new this week
            .mockResolvedValueOnce({ count: 50 }); // subscribers
        
        const res = await app.request("http://localhost/stats", {}, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { totalAssets: number; totalDownloads: number };
        expect(data.totalAssets).toBe(100);
        expect(data.totalDownloads).toBe(5000);
    });

    it("GET /stats should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/stats", {}, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("GET /assets/:id/source should return SVG file", async () => {
        const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
        mockFirst.mockResolvedValueOnce({ r2_key_source: "sources/test.svg" });
        mockR2Get.mockResolvedValue({ 
            body: svgContent,
            writeHttpMetadata: vi.fn() // R2ObjectBody has this method
        });
        
        const res = await app.request("http://localhost/assets/123/source", {}, mockEnv);
        
        expect(res.status).toBe(200);
    });

    it("GET /assets/:id/source should return 404 if no source key", async () => {
        mockFirst.mockResolvedValueOnce({ r2_key_source: null });
        
        const res = await app.request("http://localhost/assets/123/source", {}, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("GET /assets/:id/source should return 404 if file not in R2", async () => {
        mockFirst.mockResolvedValueOnce({ r2_key_source: "sources/test.svg" });
        mockR2Get.mockResolvedValue(null);
        
        const res = await app.request("http://localhost/assets/123/source", {}, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("GET /assets/:id/source should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/123/source", {}, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("POST /assets/bulk-delete should delete multiple assets", async () => {
        mockFirst
            .mockResolvedValueOnce({ r2_key_private: "pdfs/1.pdf", r2_key_public: "thumbs/1.webp" })
            .mockResolvedValueOnce({ r2_key_private: "pdfs/2.pdf", r2_key_public: "thumbs/2.webp" });
        
        const res = await app.request("http://localhost/assets/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1", "id2"] })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { deletedCount: number };
        expect(data.deletedCount).toBe(2);
    });

    it("POST /assets/bulk-delete should delete all R2 keys including OG and source", async () => {
        mockFirst.mockResolvedValueOnce({ 
            r2_key_private: "pdfs/1.pdf", 
            r2_key_public: "thumbs/1.webp",
            r2_key_og: "og-images/1.png",
            r2_key_source: "sources/1.svg"
        });
        
        const res = await app.request("http://localhost/assets/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"] })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        // Should have called R2 delete for all 4 keys
        expect(mockR2Delete).toHaveBeenCalledTimes(4);
    });

    it("POST /assets/bulk-delete should skip draft/pending R2 keys", async () => {
        mockFirst.mockResolvedValueOnce({ 
            r2_key_private: "__draft__/test.pdf", 
            r2_key_public: "__pending__/test.webp",
            r2_key_og: "__draft__/test.png",
            r2_key_source: "__pending__/test.svg"
        });
        
        const localMockR2Delete = vi.fn();
        mockEnv.ASSETS_PRIVATE = { ...mockEnv.ASSETS_PRIVATE as object, delete: localMockR2Delete };
        mockEnv.ASSETS_PUBLIC = { ...mockEnv.ASSETS_PUBLIC as object, delete: localMockR2Delete };
        
        const res = await app.request("http://localhost/assets/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"] })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        // R2 delete should NOT be called for draft/pending keys
        expect(localMockR2Delete).not.toHaveBeenCalled();
    });

    it("POST /assets/bulk-delete should return 400 if no IDs provided", async () => {
        const res = await app.request("http://localhost/assets/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [] })
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets/bulk-delete should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"] })
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("POST /assets/bulk-status should update multiple asset statuses", async () => {
        const res = await app.request("http://localhost/assets/bulk-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1", "id2"], status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { updatedCount: number };
        expect(data.updatedCount).toBe(2);
    });

    it("POST /assets/bulk-status should return 400 if no IDs provided", async () => {
        const res = await app.request("http://localhost/assets/bulk-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [], status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets/bulk-status should return 400 if invalid status", async () => {
        const res = await app.request("http://localhost/assets/bulk-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"], status: "invalid" })
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets/bulk-status should handle database error", async () => {
        mockRun.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/bulk-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"], status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("DELETE /assets/:id should handle R2 deletion errors gracefully", async () => {
        mockFirst.mockResolvedValueOnce({ 
            id: "123", 
            r2_key_private: "pdfs/test.pdf",
            r2_key_public: "thumbs/test.webp",
            r2_key_og: "og-images/test.png"
        });
        mockR2Delete.mockRejectedValue(new Error("R2 error"));
        
        const res = await app.request("http://localhost/assets/123", {
            method: "DELETE",
        }, mockEnv);
        
        // Should still return 500 since R2 delete failed
        expect(res.status).toBe(500);
    });

    it("DELETE /assets/:id should skip draft R2 keys", async () => {
        mockFirst.mockResolvedValueOnce({ 
            id: "123", 
            r2_key_private: "__draft__/test.pdf",
            r2_key_public: "__pending__/test.webp"
        });
        
        const localMockR2Delete = vi.fn();
        mockEnv.ASSETS_PRIVATE = { ...mockEnv.ASSETS_PRIVATE as object, delete: localMockR2Delete };
        mockEnv.ASSETS_PUBLIC = { ...mockEnv.ASSETS_PUBLIC as object, delete: localMockR2Delete };
        
        const res = await app.request("http://localhost/assets/123", {
            method: "DELETE",
        }, mockEnv);
        
        expect(res.status).toBe(200);
        // R2 delete should NOT be called for draft keys
        expect(localMockR2Delete).not.toHaveBeenCalled();
    });

    it("POST /assets/bulk-regenerate should return 400 if no IDs provided", async () => {
        const res = await app.request("http://localhost/assets/bulk-regenerate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [] })
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets/bulk-regenerate should skip assets without source", async () => {
        mockFirst.mockResolvedValueOnce({ id: "id1", r2_key_source: null }); // No source
        
        const mockExecutionCtx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
            props: {},
        } as ExecutionContext;
        
        const res = await app.request("http://localhost/assets/bulk-regenerate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"] })
        }, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(200);
        const data = await res.json() as { queuedCount: number };
        expect(data.queuedCount).toBe(0); // Skipped because no source
    });

    it("POST /assets/:id/regenerate-og should return 404 if asset not found", async () => {
        mockFirst.mockResolvedValueOnce(null);
        
        const res = await app.request("http://localhost/assets/unknown/regenerate-og", {
            method: "POST"
        }, mockEnv);
        
        expect(res.status).toBe(404);
    });

    it("POST /assets/:id/regenerate-og should return 400 if no source or thumbnail", async () => {
        mockFirst.mockResolvedValueOnce({ 
            id: "123",
            title: "Test",
            r2_key_public: null,
            r2_key_source: null
        });
        
        const res = await app.request("http://localhost/assets/123/regenerate-og", {
            method: "POST"
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("GET /assets should handle database error", async () => {
        mockAll.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets", {}, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("GET /assets/:id should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/123", {}, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("PATCH /assets/:id/status should handle database error", async () => {
        mockRun.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/assets/123/status", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "published" })
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("POST /create-draft should handle database error", async () => {
        mockFirst.mockResolvedValueOnce({ value: 1 }); // Sequence
        mockRun.mockRejectedValue(new Error("DB error"));

        const formData = new FormData();
        formData.append("title", "Test");
        formData.append("category", "Animals");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("POST /assets should require title", async () => {
        const formData = new FormData();
        formData.append("category", "Animals");
        formData.append("thumbnail", new File([""], "thumb.png", { type: "image/png" }));

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets should require category", async () => {
        const formData = new FormData();
        formData.append("title", "Test Title");
        formData.append("thumbnail", new File([""], "thumb.png", { type: "image/png" }));

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(400);
    });

    it("POST /assets should handle update of existing asset", async () => {
        const formData = new FormData();
        formData.append("title", "Updated Asset");
        formData.append("category", "Animals");
        formData.append("asset_id", "HP-ANM-0001");
        formData.append("status", "published");

        // Mock existing asset lookup
        mockFirst.mockResolvedValueOnce({ id: "existing-uuid" });

        const mockExecutionCtx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
            props: {},
        } as ExecutionContext;

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            body: formData
        }, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(200);
    });

    it("POST /assets/bulk-regenerate should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/bulk-regenerate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["id1"] })
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("DELETE /assets/:id should handle delete database error", async () => {
        mockFirst.mockResolvedValueOnce({ r2_key_private: null, r2_key_public: null });
        mockBatch.mockRejectedValue(new Error("DB error"));
        
        const res = await app.request("http://localhost/assets/123", {
            method: "DELETE"
        }, mockEnv);
        
        expect(res.status).toBe(500);
    });

    it("POST /create-draft should return 401 for non-admin", async () => {
        mockGetAuth.mockReturnValue({ 
            userId: "user_regular",
            sessionClaims: { publicMetadata: {} }
        });

        const formData = new FormData();
        formData.append("title", "Test");
        formData.append("category", "Animals");

        const res = await app.request("http://localhost/create-draft", {
            method: "POST",
            body: formData
        }, mockEnv);
        
        expect(res.status).toBe(401);
    });


    it("POST /assets/bulk-regenerate should trigger container generation", async () => {
        const assetId = "HP-ANM-0001";
        const mockAsset = {
            id: "uuid-123",
            asset_id: assetId,
            slug: "test-asset",
            title: "Test Asset",
            description: "Description",
            r2_key_source: "sources/test.svg"
        };

        // Mock DB finding the asset
        mockFirst.mockResolvedValueOnce(mockAsset);

        // Mock R2 getting the source file
        mockR2Get.mockResolvedValue({
            text: vi.fn().mockResolvedValue("<svg>content</svg>"),
            writeHttpMetadata: vi.fn()
        });

        // Mock Container Fetch
        const mockContainerFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ success: true, elapsedMs: 50 })
        });

        // Update the container mock for this specific test
        const { getContainer } = await import("@cloudflare/containers");
        vi.mocked(getContainer).mockReturnValue({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fetch: mockContainerFetch as any 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        // Capture promise passed to waitUntil
        let backgroundPromise: Promise<void> | undefined;
        const mockExecutionCtx = {
            waitUntil: vi.fn((promise) => {
                backgroundPromise = promise;
            }),
            passThroughOnException: vi.fn(),
            props: {},
        } as unknown as ExecutionContext;

        const res = await app.request("http://localhost/assets/bulk-regenerate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ["uuid-123"] })
        }, mockEnv, mockExecutionCtx);

        expect(res.status).toBe(200);
        
        // Wait for the background task to finish
        if (backgroundPromise) {
            await backgroundPromise;
        }

        // Verify DB was checked for existing job
        expect(mockFirst).toHaveBeenCalledTimes(2); // 1. Asset check, 2. Queue check

        // Verify container wakeup was called
        expect(mockContainerFetch).toHaveBeenCalled();
        const callArgs = mockContainerFetch.mock.calls[0];
        expect(callArgs[0]).toBe("http://container/wakeup");
        expect(callArgs[1]).toMatchObject({
            method: "GET"
        });
        
        // Verify we DID NOT fetch R2 source (container does that now)
        expect(mockR2Get).not.toHaveBeenCalled();
    });

    describe("Admin Requests", () => {
        beforeEach(() => {
            // Reset to admin
            mockGetAuth.mockReturnValue({ 
                userId: "user_admin",
                sessionClaims: { publicMetadata: { role: 'admin' } }
            });
        });

        it("GET /requests should return all design requests", async () => {
            mockAll.mockResolvedValue({ results: [{ id: "1", status: "pending" }] });
            mockFirst.mockResolvedValueOnce({ total: 1 });
            
            const res = await app.request("http://localhost/requests", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { requests: unknown[]; total: number };
            expect(data.requests).toHaveLength(1);
            expect(data.total).toBe(1);
        });

        it("GET /requests should filter by status", async () => {
            mockAll.mockResolvedValue({ results: [] });
            mockFirst.mockResolvedValueOnce({ total: 0 });
            
            const res = await app.request("http://localhost/requests?status=approved", {}, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("WHERE status = ?"));
        });

        it("GET /requests should return 401 for non-admin", async () => {
            mockGetAuth.mockReturnValue({ userId: "user_regular", sessionClaims: {} });
            
            const res = await app.request("http://localhost/requests", {}, mockEnv);
            
            expect(res.status).toBe(401);
        });

        it("PATCH /requests/:id should update request status", async () => {
            const res = await app.request("http://localhost/requests/123", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" })
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockRun).toHaveBeenCalled();
        });

        it("PATCH /requests/:id should update admin_notes", async () => {
            const res = await app.request("http://localhost/requests/123", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin_notes: "Approved with notes" })
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });

        it("PATCH /requests/:id should return 401 for non-admin", async () => {
            mockGetAuth.mockReturnValue({ userId: "user_regular", sessionClaims: {} });
            
            const res = await app.request("http://localhost/requests/123", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" })
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("Regenerate OG", () => {
        beforeEach(() => {
            mockGetAuth.mockReturnValue({ 
                userId: "user_admin",
                sessionClaims: { publicMetadata: { role: 'admin' } }
            });
        });

        it("POST /assets/:id/regenerate-og should succeed with source SVG", async () => {
            mockFirst.mockResolvedValueOnce({ 
                id: "123",
                title: "Test Asset",
                asset_id: "HP-ANM-0001",
                r2_key_public: "thumbnails/123.webp",
                r2_key_source: "sources/123.svg",
                r2_key_og: "og-images/123.png"
            });
            mockR2Get.mockResolvedValueOnce({ 
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
            }); // Thumbnail
            mockR2Get.mockResolvedValueOnce({ 
                text: vi.fn().mockResolvedValue('<svg></svg>')
            }); // Source

            const res = await app.request("http://localhost/assets/123/regenerate-og", {
                method: "POST"
            }, mockEnv);
            
            if (res.status === 500) {
                const err = await res.json();
                console.error("DEBUG REGEN OG ERROR:", err);
            }
            expect(res.status).toBe(200);
        });

        it("POST /assets/:id/regenerate-og should handle container error", async () => {
            mockFirst.mockResolvedValueOnce({ 
                id: "123",
                title: "Test",
                r2_key_public: "thumbnails/123.webp",
                r2_key_source: null
            });
            mockR2Get.mockResolvedValueOnce(null); // Thumbnail not found

            const res = await app.request("http://localhost/assets/123/regenerate-og", {
                method: "POST"
            }, mockEnv);
            
            // Should succeed because we check r2_key_public || r2_key_source, and public exists
            // Even if R2.get returns null, the condition passes initially
            expect(res.status).toBe(200);
        });
    });
});

