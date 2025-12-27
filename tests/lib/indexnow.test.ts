import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyIndexNow, notifyIndexNowBatch, buildAssetUrl, buildBlogUrl } from "../../src/lib/indexnow";

describe("IndexNow Integration", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    describe("notifyIndexNow", () => {
        it("should notify search engines successfully", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                status: 200
            });

            const result = await notifyIndexNow("https://huepress.co/test-page");
            
            expect(result.success).toBe(true);
            expect(result.url).toBe("https://huepress.co/test-page");
            expect(result.responses[0].status).toBe(200);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("api.indexnow.org/indexnow"),
                expect.objectContaining({ method: "GET" })
            );
        });

        it("should handle 202 Accepted status", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 202
            });

            const result = await notifyIndexNow("https://huepress.co/test-page");
            
            expect(result.success).toBe(true);
            expect(result.responses[0].status).toBe(202);
        });

        it("should handle non-ok response", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 400
            });

            const result = await notifyIndexNow("https://huepress.co/test-page");
            
            expect(result.success).toBe(false);
            expect(result.responses[0].status).toBe(400);
        });

        it("should handle fetch errors gracefully", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

            const result = await notifyIndexNow("https://huepress.co/test-page");
            
            expect(result.success).toBe(false);
            expect(result.responses[0].status).toBe(0);
        });
    });

    describe("notifyIndexNowBatch", () => {
        it("should return early for empty array", async () => {
            const result = await notifyIndexNowBatch([]);
            
            expect(result.success).toBe(true);
            expect(result.count).toBe(0);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("should submit batch successfully", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                status: 200
            });

            const urls = [
                "https://huepress.co/page1",
                "https://huepress.co/page2"
            ];
            const result = await notifyIndexNowBatch(urls);
            
            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://api.indexnow.org/indexnow",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("urlList")
                })
            );
        });

        it("should handle 202 Accepted status", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 202
            });

            const result = await notifyIndexNowBatch(["https://huepress.co/page1"]);
            
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });

        it("should handle batch submission failure", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 500
            });

            const result = await notifyIndexNowBatch(["https://huepress.co/page1"]);
            
            expect(result.success).toBe(false);
            expect(result.count).toBe(0);
        });

        it("should handle network errors gracefully", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

            const result = await notifyIndexNowBatch(["https://huepress.co/page1"]);
            
            expect(result.success).toBe(false);
            expect(result.count).toBe(0);
        });
    });

    describe("URL builders", () => {
        it("buildAssetUrl should format asset URL correctly", () => {
            const url = buildAssetUrl("HP-ANM-00001", "cute-cat");
            expect(url).toBe("https://huepress.co/coloring-pages/HP-ANM-00001/cute-cat");
        });

        it("buildBlogUrl should format blog URL correctly", () => {
            const url = buildBlogUrl("how-to-color");
            expect(url).toBe("https://huepress.co/blog/how-to-color");
        });
    });
});
