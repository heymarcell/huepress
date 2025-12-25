import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getAuth } from "@hono/clerk-auth";
import app from "../../src/api/routes/stripe";

vi.mock("@hono/clerk-auth", () => ({
    getAuth: vi.fn()
}));

describe("Stripe API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockFirst: Mock;

    let mockEnv: Record<string, unknown>;
    
    beforeEach(() => {
        mockFirst = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        
        const statement = {
            first: mockFirst,
            bind: mockBind
        };
        mockBind.mockReturnValue(statement);
        mockPrepare.mockReturnValue(statement);
        
        mockEnv = {
            DB: { prepare: mockPrepare },
            STRIPE_SECRET_KEY: "sk_test_xxx",
            SITE_URL: "https://huepress.co"
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    describe("POST /checkout", () => {
        it("should return 401 when user is not authenticated", async () => {
            // Mock getAuth to return no user
            (getAuth as Mock).mockReturnValue(null);

            const body = { priceId: "price_xxx", email: "test@example.com" };
            const res = await app.request("http://localhost/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            }, mockEnv);
            
            expect(res.status).toBe(401);
            const data = await res.json() as { error: string };
            expect(data.error).toBe("Unauthorized");
        });

        it("should return 401 when userId is missing from auth", async () => {
            // Mock getAuth to return auth object without userId
            (getAuth as Mock).mockReturnValue({ userId: null });

            const body = { priceId: "price_xxx", email: "test@example.com" };
            const res = await app.request("http://localhost/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("POST /portal", () => {
        it("should return 401 when user is not authenticated", async () => {
            (getAuth as Mock).mockReturnValue(null);

            const res = await app.request("http://localhost/portal", {
                method: "POST"
            }, mockEnv);
            
            expect(res.status).toBe(401);
            const data = await res.json() as { error: string };
            expect(data.error).toBe("Unauthorized");
        });

        it("should return 404 when user has no subscription", async () => {
            (getAuth as Mock).mockReturnValue({ userId: "clerk_123" });
            mockFirst.mockResolvedValue(null); // No user found

            const res = await app.request("http://localhost/portal", {
                method: "POST"
            }, mockEnv);
            
            expect(res.status).toBe(404);
            const data = await res.json() as { error: string };
            expect(data.error).toBe("No subscription found");
        });
    });
});
