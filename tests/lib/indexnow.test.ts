import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyIndexNow, notifyIndexNowBatch, buildAssetUrl, buildBlogUrl, resetIndexNowState } from "../../src/lib/indexnow";

describe("IndexNow Integration", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        global.fetch = vi.fn();
        resetIndexNowState(); // Clear rate limiting state
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

    describe("Rate Limiting", () => {
        it("should throttle rapid successive batch submissions", async () => {
            const urls1 = ["https://huepress.co/page1"];
            const urls2 = ["https://huepress.co/page2"];
            
            // Mock successful first submission
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                status: 200,
            } as Response);
            
            const result1 = await notifyIndexNowBatch(urls1);
            expect(result1.throttled).toBeUndefined();
            expect(result1.success).toBe(true);
            
            // Immediate second call should be throttled (no fetch)
            const result2 = await notifyIndexNowBatch(urls2);
            expect(result2.throttled).toBe(true);
            expect(result2.count).toBe(0);
            expect(result2.success).toBe(false);
        });
        
        it("should deduplicate URLs within 24h window", async () => {
            // Use real timers for this test since we need actual time passage
            vi.useRealTimers();
            
            const url = "https://huepress.co/test-dedupe";
            
            // Mock successful submissions
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                } as Response);
            
            // First submission
            const result1 = await notifyIndexNowBatch([url]);
            expect(result1.count).toBe(1);
            
            // Wait 62 seconds to pass cooldown period
            await new Promise(r => setTimeout(r, 62000));
            
            // Second submission should be deduped (0 unique URLs)
            const result2 = await notifyIndexNowBatch([url]);
            expect(result2.count).toBe(0);
            expect(result2.success).toBe(true); // Success but nothing sent
            
            // Re-enable fake timers for next tests
            vi.useFakeTimers();
        }, 65000); // Increase timeout for this test
        
        it("should handle throttled single URL notifications", async () => {
            const url1 = "https://huepress.co/single1";
            const url2 = "https://huepress.co/single2";
            
            // Mock successful first call
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                status: 200,
            } as Response);
            
            const result1 = await notifyIndexNow(url1);
            expect(result1.throttled).toBeUndefined();
            
            // Second call should be throttled
            const result2 = await notifyIndexNow(url2);
            expect(result2.throttled).toBe(true);
        });
    });
});
