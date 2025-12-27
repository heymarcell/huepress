import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

vi.mock("@hono/clerk-auth", () => ({
  getAuth: vi.fn(),
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => await next(),
}));

import { getAuth } from "@hono/clerk-auth";
import app from "../../src/api/routes/blog";

describe("Blog API", () => {
    let mockBind: Mock;
    let mockPrepare: Mock;
    let mockAll: Mock;
    let mockRun: Mock;
    let mockFirst: Mock;
    let mockEnv: Record<string, unknown>;
    let mockGetAuth: Mock;

    beforeEach(() => {
        mockAll = vi.fn();
        mockRun = vi.fn();
        mockFirst = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        mockGetAuth = getAuth as unknown as Mock;
        
        // Default: admin user
        mockGetAuth.mockReturnValue({ 
            userId: "user_admin",
            sessionClaims: { publicMetadata: { role: 'admin' } }
        });

        const mockStatement = {
            all: mockAll,
            run: mockRun,
            first: mockFirst,
            bind: mockBind
        };
        mockBind.mockReturnValue(mockStatement);
        mockPrepare.mockReturnValue(mockStatement);

        mockEnv = {
            DB: { prepare: mockPrepare }
        };
    });

    // =====================
    // PUBLIC ENDPOINTS
    // =====================

    describe("GET /posts (public)", () => {
        it("should return published posts", async () => {
            mockAll.mockResolvedValue({ 
                results: [{ id: "1", title: "Test Post", slug: "test-post" }] 
            });
            mockFirst.mockResolvedValue({ total: 1 });

            const res = await app.request("http://localhost/posts", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { posts: unknown[] };
            expect(data.posts).toHaveLength(1);
        });

        it("should support pagination", async () => {
            mockAll.mockResolvedValue({ results: [] });
            mockFirst.mockResolvedValue({ total: 0 });

            const res = await app.request("http://localhost/posts?limit=5&offset=10", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { limit: number; offset: number };
            expect(data.limit).toBe(5);
            expect(data.offset).toBe(10);
        });
    });

    describe("GET /posts/:slug (public)", () => {
        it("should return post by slug", async () => {
            mockFirst.mockResolvedValue({ id: "1", title: "Test", slug: "test-slug", content: "# Hello" });

            const res = await app.request("http://localhost/posts/test-slug", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { post: { title: string } };
            expect(data.post.title).toBe("Test");
        });

        it("should return 404 for unknown slug", async () => {
            mockFirst.mockResolvedValue(null);

            const res = await app.request("http://localhost/posts/unknown-slug", {}, mockEnv);
            
            expect(res.status).toBe(404);
        });
    });

    // =====================
    // ADMIN ENDPOINTS
    // =====================

    describe("GET /admin/posts (admin)", () => {
        it("should return all posts for admin", async () => {
            mockAll.mockResolvedValue({ 
                results: [
                    { id: "1", status: "published" },
                    { id: "2", status: "draft" }
                ] 
            });

            const res = await app.request("http://localhost/admin/posts", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { posts: unknown[] };
            expect(data.posts).toHaveLength(2);
        });

        it("should return 401 for non-admin", async () => {
            mockGetAuth.mockReturnValue({ 
                userId: "user_regular",
                sessionClaims: { publicMetadata: {} }
            });

            const res = await app.request("http://localhost/admin/posts", {}, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("GET /admin/posts/:id (admin)", () => {
        it("should return post by ID", async () => {
            mockFirst.mockResolvedValue({ id: "123", title: "Test Post" });

            const res = await app.request("http://localhost/admin/posts/123", {}, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { post: { id: string } };
            expect(data.post.id).toBe("123");
        });

        it("should return 404 for unknown ID", async () => {
            mockFirst.mockResolvedValue(null);

            const res = await app.request("http://localhost/admin/posts/unknown", {}, mockEnv);
            
            expect(res.status).toBe(404);
        });
    });

    describe("POST /admin/posts (admin)", () => {
        it("should create new post", async () => {
            mockFirst.mockResolvedValue(null); // No slug conflict

            const res = await app.request("http://localhost/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "New Post", content: "# Hello" })
            }, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { success: boolean; slug: string };
            expect(data.success).toBe(true);
            expect(data.slug).toBe("new-post");
        });

        it("should require title", async () => {
            const res = await app.request("http://localhost/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "# Hello" })
            }, mockEnv);
            
            expect(res.status).toBe(400);
        });

        it("should auto-generate unique slug on conflict", async () => {
            mockFirst.mockResolvedValue({ id: "existing" }); // Slug exists

            const res = await app.request("http://localhost/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Existing Post" })
            }, mockEnv);
            
            expect(res.status).toBe(200);
            const data = await res.json() as { slug: string };
            // Should have timestamp appended
            expect(data.slug).toMatch(/^existing-post-\d+$/);
        });

        it("should return 401 for non-admin", async () => {
            mockGetAuth.mockReturnValue({ 
                userId: "user_regular",
                sessionClaims: { publicMetadata: {} }
            });

            const res = await app.request("http://localhost/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Test" })
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("PUT /admin/posts/:id (admin)", () => {
        it("should update post", async () => {
            mockFirst.mockResolvedValueOnce({ id: "123", status: "draft" }) // Existing post
                     .mockResolvedValueOnce(null); // No slug conflict

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Updated Title" })
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockRun).toHaveBeenCalled();
        });

        it("should return 404 for unknown post", async () => {
            mockFirst.mockResolvedValue(null);

            const res = await app.request("http://localhost/admin/posts/unknown", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Test" })
            }, mockEnv);
            
            expect(res.status).toBe(404);
        });

        it("should reject duplicate slug", async () => {
            mockFirst.mockResolvedValueOnce({ id: "123" }) // Existing post
                     .mockResolvedValueOnce({ id: "other" }); // Slug conflict

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: "existing-slug" })
            }, mockEnv);
            
            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /admin/posts/:id (admin)", () => {
        it("should delete post", async () => {
            mockFirst.mockResolvedValue({ id: "123" });

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "DELETE"
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockRun).toHaveBeenCalled();
        });

        it("should return 404 for unknown post", async () => {
            mockFirst.mockResolvedValue(null);

            const res = await app.request("http://localhost/admin/posts/unknown", {
                method: "DELETE"
            }, mockEnv);
            
            expect(res.status).toBe(404);
        });

        it("should return 401 for non-admin", async () => {
            mockGetAuth.mockReturnValue({ 
                userId: "user_regular",
                sessionClaims: { publicMetadata: {} }
            });

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "DELETE"
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("Error Handling", () => {
        it("GET /posts should handle database error", async () => {
            mockAll.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/posts", {}, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("GET /posts/:slug should handle database error", async () => {
            mockFirst.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/posts/test-slug", {}, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("GET /admin/posts should handle database error", async () => {
            mockAll.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/admin/posts", {}, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("GET /admin/posts/:id should handle database error", async () => {
            mockFirst.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/admin/posts/123", {}, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("POST /admin/posts should handle database error", async () => {
            mockFirst.mockResolvedValueOnce(null); // No slug conflict
            mockRun.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Test" })
            }, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("PUT /admin/posts/:id should handle database error on update", async () => {
            mockFirst.mockResolvedValueOnce({ id: "123" }); // Existing post
            mockFirst.mockResolvedValueOnce(null); // No slug conflict
            mockRun.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Updated" })
            }, mockEnv);
            
            expect(res.status).toBe(500);
        });

        it("DELETE /admin/posts/:id should handle database error", async () => {
            mockFirst.mockResolvedValueOnce({ id: "123" });
            mockRun.mockRejectedValue(new Error("DB error"));

            const res = await app.request("http://localhost/admin/posts/123", {
                method: "DELETE"
            }, mockEnv);
            
            expect(res.status).toBe(500);
        });
    });
});

