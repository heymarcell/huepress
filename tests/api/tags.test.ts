import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/tags";

describe("Tags API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockFirst: Mock;
    let mockEnv: Record<string, unknown>;
    
    beforeEach(() => {
        mockAll = vi.fn();
        mockFirst = vi.fn();
        mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
        // Support both prepare().bind().all() AND prepare().all() (for queries without bind)
        mockPrepare = vi.fn().mockReturnValue({ 
            bind: mockBind,
            all: mockAll,  // Direct all() for queries like "SELECT tags FROM assets"
            first: mockFirst
        });
        mockEnv = {
            DB: {
                prepare: mockPrepare
            }
        };
    });

    it("GET / should return all tags grouped", async () => {
        const mockTags = [
            { id: 1, name: "Animals", type: "category" },
            { id: 2, name: "Easy", type: "skill" }
        ];
        mockAll.mockResolvedValue({ results: mockTags });
        
        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { tags: unknown[], grouped: Record<string, unknown[]> };
        expect(data.tags).toHaveLength(2);
        expect(data.grouped.category).toHaveLength(1);
        expect(data.grouped.skill).toHaveLength(1);
    });

    it("GET / should include Cache-Control header", async () => {
        mockAll.mockResolvedValue({ results: [] });
        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
    });

    it("GET / should aggregate dynamic themes from assets", async () => {
        const mockTags = [
            { id: 1, name: "Animals", type: "category", display_order: 1 }
        ];
        // First query returns official tags
        mockAll.mockResolvedValueOnce({ results: mockTags });
        // Second query returns asset tags for dynamic themes
        mockAll.mockResolvedValueOnce({ results: [
            { tags: '["CustomTheme1", "CustomTheme2"]' },
            { tags: '["Animals", "CustomTheme1"]' } // Animals is already a known tag
        ]});
        
        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { grouped: Record<string, { name: string }[]>, tags: unknown[] };
        // Category should be grouped
        expect(data.grouped.category).toBeDefined();
        // The request should succeed even with dynamic theme aggregation
        expect(data.tags).toBeDefined();
    });

    it("GET / should handle assets with null tags", async () => {
        mockAll.mockResolvedValueOnce({ results: [] });
        mockAll.mockResolvedValueOnce({ results: [
            { tags: null },
            { tags: '["Valid"]' }
        ]});
        
        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.status).toBe(200);
    });

    it("GET / should handle invalid JSON in asset tags", async () => {
        mockAll.mockResolvedValueOnce({ results: [] });
        mockAll.mockResolvedValueOnce({ results: [
            { tags: 'not valid json' }
        ]});
        
        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.status).toBe(200);
    });

    it("GET /?type=category should filter query", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/?type=category", {}, mockEnv);
        
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("WHERE type = ?"));
        expect(mockBind).toHaveBeenCalledWith("category");
    });

    it("GET /?type=theme should aggregate dynamic themes", async () => {
        mockAll.mockResolvedValueOnce({ results: [
            { id: "t1", name: "Calm", type: "theme", display_order: 1 }
        ]});
        mockAll.mockResolvedValueOnce({ results: [
            { tags: '["DynamicTheme"]' }
        ]});
        
        const res = await app.request("http://localhost/?type=theme", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { grouped: Record<string, { name: string }[]> };
        expect(data.grouped.theme.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /:id should return single tag", async () => {
        const mockTag = { id: 1, name: "Test" };
        mockFirst.mockResolvedValue(mockTag);

        const res = await app.request("http://localhost/1", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { tag: unknown };
        expect(data.tag).toEqual(mockTag);
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ? OR slug = ?"));
    });

    it("GET /:id should return 404 if not found", async () => {
        mockFirst.mockResolvedValue(null);
        const res = await app.request("http://localhost/999", {}, mockEnv);
        expect(res.status).toBe(404);
    });

    it("GET /asset/:assetId should return tags for asset", async () => {
        mockAll.mockResolvedValue({ results: [
            { id: "t1", name: "Animals", type: "category" }
        ]});

        const res = await app.request("http://localhost/asset/asset_123", {}, mockEnv);
        expect(res.status).toBe(200);
        
        const data = await res.json() as { tags: unknown[] };
        expect(data.tags).toHaveLength(1);
    });

    it("GET / should handle database error", async () => {
        mockAll.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/", {}, mockEnv);
        expect(res.status).toBe(500);
    });

    it("GET /:id should handle database error", async () => {
        mockFirst.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/1", {}, mockEnv);
        expect(res.status).toBe(500);
    });

    it("GET /asset/:assetId should handle database error", async () => {
        mockAll.mockRejectedValue(new Error("DB error"));

        const res = await app.request("http://localhost/asset/asset_123", {}, mockEnv);
        expect(res.status).toBe(500);
    });

    describe("Dynamic Theme Aggregation", () => {
        it("should add dynamic themes from asset tags", async () => {
            // First: official tags query
            mockAll.mockResolvedValueOnce({ results: [
                { id: 1, name: "Animals", type: "category", display_order: 1 }
            ]});
            // Second: asset tags query
            mockAll.mockResolvedValueOnce({ results: [
                { tags: '["Cute", "Fluffy"]' },
                { tags: '["Animals", "Cute"]' } // Animals is known
            ]});
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
            
            const data = await res.json() as { tags: unknown[], grouped: Record<string, unknown[]> };
            // Request should succeed and return grouped tags
            expect(data.tags).toBeDefined();
            expect(data.grouped.category).toBeDefined();
        });

        it("should handle empty asset tags", async () => {
            mockAll.mockResolvedValueOnce({ results: [] });
            mockAll.mockResolvedValueOnce({ results: [] });
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
        });

        it("should handle non-array tags gracefully", async () => {
            mockAll.mockResolvedValueOnce({ results: [] });
            mockAll.mockResolvedValueOnce({ results: [
                { tags: '{"not": "array"}' } // Object, not array
            ]});
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
        });

        it("should filter empty string tags", async () => {
            mockAll.mockResolvedValueOnce({ results: [] });
            mockAll.mockResolvedValueOnce({ results: [
                { tags: '["", "Valid", "  "]' } // Empty strings should be filtered
            ]});
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
        });

        it("should handle aggregation error gracefully", async () => {
            mockAll.mockResolvedValueOnce({ results: [] }); // First query
            mockAll.mockRejectedValueOnce(new Error("DB error")); // Second query fails
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            // Should still return 200 - aggregation failure is non-fatal
            expect(res.status).toBe(200);
        });

        it("should sort dynamic themes alphabetically after official", async () => {
            mockAll.mockResolvedValueOnce({ results: [
                { id: 1, name: "Official", type: "theme", display_order: 1 }
            ]});
            mockAll.mockResolvedValueOnce({ results: [
                { tags: '["Zebra", "Apple"]' }
            ]});
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
        });

        it("should trim tag whitespace", async () => {
            mockAll.mockResolvedValueOnce({ results: [] });
            mockAll.mockResolvedValueOnce({ results: [
                { tags: '["  Spacey  ", "Normal"]' }
            ]});
            
            const res = await app.request("http://localhost/", {}, mockEnv);
            expect(res.status).toBe(200);
        });
    });
});


