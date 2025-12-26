import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

// Mock Clerk auth
vi.mock("@hono/clerk-auth", () => ({
    getAuth: vi.fn(),
    clerkMiddleware: vi.fn(() => async (_c: any, next: any) => await next()),
}));

import app from "../../src/api/routes/requests";
import { getAuth } from "@hono/clerk-auth";

describe("Requests API", () => {
    let mockEnv: Record<string, unknown>;
    let mockPrepare: Mock;
    let mockBind: Mock;
    let mockRun: Mock;
    let mockFirst: Mock;
    
    beforeEach(() => {
        mockRun = vi.fn().mockResolvedValue({ success: true });
        mockFirst = vi.fn();
        mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
        mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
        
        mockEnv = {
            DB: { prepare: mockPrepare },
        };
        
        // Reset mocks
        vi.mocked(getAuth).mockReset();
    });

    describe("POST /submit", () => {
        it("should create request with all required fields", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Dragon Design",
                    description: "Please create a cute dragon",
                    email: "user@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty("success", true);
            expect(data).toHaveProperty("id");
            expect(mockRun).toHaveBeenCalled();
        });

        it("should reject request without title", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: "Please create something",
                    email: "user@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Missing required fields");
        });

        it("should reject request without description", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Dragon",
                    email: "user@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(400);
        });

        it("should reject request without email", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Dragon",
                    description: "Make it cool"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(400);
        });

        it("should link to user if authenticated", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: "clerk_123" } as any);
            mockFirst.mockResolvedValue({ id: "db-user-id", email: "user@example.com" });
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "My Dragon",
                    description: "A cool dragon",
                    email: "user@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(200);
            // Verify user lookup was called
            expect(mockPrepare).toHaveBeenCalledWith(
                expect.stringContaining("SELECT id, email FROM users WHERE clerk_id = ?")
            );
        });

        it("should handle anonymous submissions", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Anonymous Request",
                    description: "From anonymous user",
                    email: "anon@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });

        it("should handle database errors gracefully", async () => {
            vi.mocked(getAuth).mockReturnValue({ userId: null } as any);
            mockRun.mockRejectedValue(new Error("DB connection failed"));
            
            const res = await app.request("http://localhost/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Test",
                    description: "Test",
                    email: "test@example.com"
                }),
            }, mockEnv);
            
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Failed to submit request");
        });
    });
});
