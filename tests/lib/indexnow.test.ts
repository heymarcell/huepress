import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyIndexNow, notifyIndexNowBatch, buildAssetUrl, buildBlogUrl } from "../../src/lib/indexnow";

describe("IndexNow Integration", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("notifyIndexNow", () => {
        // ... (existing passed tests) ...

        it("should handle fetch errors gracefully", async () => {
            const error = new Error("Network error");
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(error);

            // Execute the promise but don't await yet, as it will pause on the timers
            const resultPromise = notifyIndexNow("https://huepress.co/test-page");

            // Fast-forward through retries (1s + 2s + 4s = 7s total)
            await vi.advanceTimersByTimeAsync(8000);

            const result = await resultPromise;
            
            expect(result.success).toBe(false);
            expect(result.count).toBe(0);
            expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
        });
    });

    describe("notifyIndexNowBatch", () => {
        // ... (existing batch tests) ...

        it("should handle network errors gracefully", async () => {
             const error = new Error("Network error");
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(error);

            const resultPromise = notifyIndexNowBatch(["https://huepress.co/page1"]);

            // Fast-forward retries
            await vi.advanceTimersByTimeAsync(8000);

            const result = await resultPromise;
            
            expect(result.success).toBe(false);
            expect(result.count).toBe(0);
        });
    });

    // ... (URL builders tests) ...
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
