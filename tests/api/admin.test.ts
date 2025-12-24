import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
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
            ADMIN_EMAILS: "admin@test.com"
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

        const res = await app.request("http://localhost/assets", {
            method: "POST",
            headers: { "X-Admin-Email": "admin@test.com" },
            body: formData
        }, mockEnv);

        expect(res.status).toBe(200);
        expect(mockR2Put).toHaveBeenCalledTimes(2); // Thumb + PDF
        expect(mockRun).toHaveBeenCalled(); // Insert
    });
});
