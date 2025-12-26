import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import app from "../../src/api/routes/internal";

describe("Internal API", () => {
    let mockEnv: Record<string, unknown>;
    let mockR2PutPublic: Mock;
    let mockR2PutPrivate: Mock;
    
    beforeEach(() => {
        mockR2PutPublic = vi.fn();
        mockR2PutPrivate = vi.fn();
        
        mockEnv = {
            INTERNAL_API_TOKEN: "test-secret-token",
            ASSETS_PUBLIC: { put: mockR2PutPublic },
            ASSETS_PRIVATE: { put: mockR2PutPrivate },
        };
    });

    describe("Authentication", () => {
        it("should reject requests without auth header", async () => {
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", { // use valid key
                method: "PUT",
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Unauthorized");
        });

        it("should reject requests with invalid token", async () => {
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", { // use valid key
                method: "PUT",
                headers: { "Authorization": "Bearer wrong-token" },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });

        it("should accept requests with valid token", async () => {
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", { // use valid key
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/png"
                },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });
    });

    describe("PUT /upload-public", () => {
        it("should upload to public bucket successfully (thumbnails)", async () => {
            const testData = new ArrayBuffer(100);
            
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/webp"
                },
                body: testData,
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });

        it("should upload to public bucket successfully (og-images)", async () => {
            const testData = new ArrayBuffer(100);
            
            const res = await app.request("http://localhost/upload-public?key=og-images/test.png", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/png"
                },
                body: testData,
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });

        it("should reject invalid public keys", async () => {
            const invalidKeys = ["test.png", "other/test.png", "pdfs/test.png"];
            
            for (const key of invalidKeys) {
                const res = await app.request(`http://localhost/upload-public?key=${key}`, {
                    method: "PUT",
                    headers: { "Authorization": "Bearer test-secret-token" },
                    body: new ArrayBuffer(10),
                }, mockEnv);
                expect(res.status).toBe(403);
                expect(await res.json()).toHaveProperty("error", "Invalid key path");
            }
        });

        it("should reject empty body", async () => {
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/png"
                },
                body: new ArrayBuffer(0),
            }, mockEnv);
            
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Invalid data");
        });

        it("should reject missing key", async () => {
            const res = await app.request("http://localhost/upload-public", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/png"
                },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(400);
        });
    });

    describe("PUT /upload-private", () => {
        it("should upload to private bucket successfully (pdfs)", async () => {
            const testData = new ArrayBuffer(200);
            
            const res = await app.request("http://localhost/upload-private?key=pdfs/test.pdf", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "application/pdf",
                    "X-Filename": "document.pdf"
                },
                body: testData,
            }, mockEnv);
            
            expect(res.status).toBe(200);
        });

        it("should reject invalid private keys", async () => {
             const invalidKeys = ["test.pdf", "other/test.pdf", "thumbnails/test.pdf"]; // Private shouldn't accept thumbnails
            
            for (const key of invalidKeys) {
                const res = await app.request(`http://localhost/upload-private?key=${key}`, {
                    method: "PUT",
                    headers: { "Authorization": "Bearer test-secret-token" },
                    body: new ArrayBuffer(10),
                }, mockEnv);
                expect(res.status).toBe(403);
            }
        });

        it("should use default content type if not provided", async () => {
            const res = await app.request("http://localhost/upload-private?key=pdfs/test.pdf", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token"
                },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockR2PutPrivate).toHaveBeenCalledWith(
                "pdfs/test.pdf",
                expect.any(ArrayBuffer),
                expect.objectContaining({
                    httpMetadata: expect.objectContaining({
                        contentType: "application/pdf"
                    })
                })
            );
        });
    });

    describe("PUT /upload-pdf (legacy)", () => {
        it("should upload PDF to private bucket", async () => {
            const res = await app.request("http://localhost/upload-pdf?key=pdfs/legacy.pdf", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Filename": "legacy.pdf"
                },
                body: new ArrayBuffer(50),
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockR2PutPrivate).toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        it("should handle R2 errors gracefully", async () => {
            mockR2PutPublic.mockRejectedValue(new Error("R2 connection failed"));
            
            const res = await app.request("http://localhost/upload-public?key=thumbnails/test.png", {
                method: "PUT",
                headers: { 
                    "Authorization": "Bearer test-secret-token",
                    "X-Content-Type": "image/png"
                },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Internal Server Error");
        });
    });
});
