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
        mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
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

    it("GET /?type=category should filter query", async () => {
        mockAll.mockResolvedValue({ results: [] });
        await app.request("http://localhost/?type=category", {}, mockEnv);
        
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("WHERE type = ?"));
        expect(mockBind).toHaveBeenCalledWith("category");
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
});
