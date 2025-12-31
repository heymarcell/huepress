import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/assets";

describe("Fair Use Policy (Rate Limiting)", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockFirst: Mock;
    let mockRun: Mock;
    let mockBatch: Mock;
    let mockEnv: Record<string, unknown>;
    let mockR2Get: Mock;
    
    // Helper to mock batch results for rate limiting
    // structure: [ { results: [{ count: N }] }, { results: [{ count: M }] } ]
    const mockRateLimits = (velocity: number, daily: number) => {
        mockBatch.mockResolvedValueOnce([
            { results: [{ count: velocity }] },
            { results: [{ count: daily }] }
        ]);
    };

    beforeEach(() => {
        mockAll = vi.fn();
        mockFirst = vi.fn();
        mockRun = vi.fn();
        mockBatch = vi.fn().mockResolvedValue([]); 
        mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst, run: mockRun });
        mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
        
        mockR2Get = vi.fn();

        mockEnv = {
            DB: {
                prepare: mockPrepare,
                batch: mockBatch
            },
            ASSETS_PRIVATE: {
                get: mockR2Get
            },
            ASSETS_CDN_URL: "https://assets.huepress.co"
        };
        
        // Mock getAuth default (authorized user)
        vi.mock("@hono/clerk-auth", () => ({
            getAuth: vi.fn(() => ({ userId: "user_123", sessionClaims: {} }))
        }));
        
        // Mock watermarkPdf to avoid parsing real PDF
        vi.mock("../../src/lib/pdf-watermark", () => ({
            watermarkPdf: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
        }));

        vi.stubGlobal('crypto', {
            randomUUID: () => "test-uuid"
        });
    });

    // Mock ExecutionContext for waitUntil
    const mockExecutionCtx = {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
        props: {},
    };

    it("should allow download when limits are not exceeded", async () => {
        const mockAsset = { id: "1", r2_key_private: "key.pdf" };
        mockFirst
            .mockResolvedValueOnce({ subscription_status: "active", id: "db_user_1" }) // User
            .mockResolvedValueOnce(mockAsset); // Asset

        // Velocity = 5, Daily = 50 (Under limits)
        mockRateLimits(5, 50);

        mockR2Get.mockResolvedValue({ 
            body: "content", 
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) 
        });

        const res = await app.request("http://localhost/download/1", {}, mockEnv, mockExecutionCtx);
        expect(res.status).toBe(200);
    });

    it("should block download when velocity limit is exceeded (Bot Protection)", async () => {

        mockFirst.mockResolvedValueOnce({ subscription_status: "active", id: "db_user_1" });
        
        // Velocity = 15 (Limit is 15) -> Should block
        mockRateLimits(15, 50);

        const res = await app.request("http://localhost/download/1", {}, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(429);
        const data = await res.json() as { error: string };
        expect(data.error).toContain("downloading too fast");
    });

    it("should block download when daily limit is exceeded (Scraping Protection)", async () => {
        mockFirst.mockResolvedValueOnce({ subscription_status: "active", id: "db_user_1" });
        
        // Velocity = 0, Daily = 100 (Limit is 100) -> Should block
        mockRateLimits(0, 100);

        const res = await app.request("http://localhost/download/1", {}, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(403);
        const data = await res.json() as { error: string };
        expect(data.error).toContain("limit reached");
    });

    it("should allow ADMIN to bypass all limits", async () => {
        // Mock Admin Auth
        const { getAuth } = await import("@hono/clerk-auth");
        (getAuth as Mock).mockReturnValue({ 
            userId: "admin_user",
            sessionClaims: { publicMetadata: { role: 'admin' } }
        });
        
        mockFirst
            .mockResolvedValueOnce({ subscription_status: "free", id: "admin_db_id" }) // User lookup
            .mockResolvedValueOnce({ id: "1", r2_key_private: "key.pdf" }); // Asset lookup

        mockR2Get.mockResolvedValue({ 
            body: "content", 
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) 
        });

        // Batch should NOT be called for admin
        const res = await app.request("http://localhost/download/1", {}, mockEnv, mockExecutionCtx);
        
        expect(res.status).toBe(200);
        expect(mockBatch).not.toHaveBeenCalled();
    });
});
