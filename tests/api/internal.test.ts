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
        it("should reject queue requests without auth header", async () => {
            const res = await app.request("http://localhost/queue/pending", {
                method: "GET",
            }, mockEnv);
            
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Unauthorized");
        });

        it("should reject queue requests with invalid token", async () => {
            const res = await app.request("http://localhost/queue/pending", {
                method: "GET",
                headers: { "Authorization": "Bearer wrong-token" },
            }, mockEnv);
            
            expect(res.status).toBe(401);
        });
    });

    describe("PUT /upload-signed/:bucket", () => {
        const validExpires = String(Math.floor(Date.now() / 1000) + 3600);
        
        const generateSig = async (path: string, key: string, expires: string, secret: string) => {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const dataToSign = `${path}:${key}:${expires}`;
            const messageData = encoder.encode(dataToSign);
            const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
            return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        it("should upload to public bucket with valid signature", async () => {
            const secret = mockEnv.INTERNAL_API_TOKEN as string;
            const requestPath = "/upload-signed/public";
            const signaturePath = "/api/internal/upload-signed/public";
            const key = "thumbnails/valid.png";
            const sig = await generateSig(signaturePath, key, validExpires, secret);

            const res = await app.request(`http://localhost${requestPath}?key=${key}&expires=${validExpires}&sig=${sig}`, {
                method: "PUT",
                headers: {
                    "X-Filename": "test.png",
                    "X-Content-Type": "image/png"
                },
                body: new ArrayBuffer(10),
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockR2PutPublic).toHaveBeenCalledWith(
                key,
                expect.any(ArrayBuffer),
                expect.objectContaining({
                    httpMetadata: expect.objectContaining({ contentType: "image/png" })
                })
            );
        });

        it("should upload to private bucket with valid signature", async () => {
            const secret = mockEnv.INTERNAL_API_TOKEN as string;
            const requestPath = "/upload-signed/private";
            const signaturePath = "/api/internal/upload-signed/private";
            const key = "pdfs/test.pdf";
            const sig = await generateSig(signaturePath, key, validExpires, secret);

            const res = await app.request(`http://localhost${requestPath}?key=${key}&expires=${validExpires}&sig=${sig}`, {
                method: "PUT",
                headers: { "X-Content-Type": "application/pdf" },
                body: new ArrayBuffer(20)
            }, mockEnv);
            
            expect(res.status).toBe(200);
            expect(mockR2PutPrivate).toHaveBeenCalledWith(
                key,
                expect.any(ArrayBuffer),
                expect.objectContaining({
                    httpMetadata: expect.objectContaining({ contentType: "application/pdf" })
                })
            );
        });

        it("should reject invalid signature", async () => {
            const key = "thumbnails/evil.png";
            const sig = "invalid_sig";
            const requestPath = "/upload-signed/public";

            const res = await app.request(`http://localhost${requestPath}?key=${key}&expires=${validExpires}&sig=${sig}`, {
                method: "PUT",
                body: new ArrayBuffer(10)
            }, mockEnv);
            
            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data).toHaveProperty("error", "Invalid or expired signature");
        });

        it("should reject expired signature", async () => {
            const secret = mockEnv.INTERNAL_API_TOKEN as string;
            const requestPath = "/upload-signed/public";
            const signaturePath = "/api/internal/upload-signed/public";
            const key = "thumbnails/expired.png";
            // Create a signature that was valid in the past
            const expiredTime = String(Math.floor(Date.now() / 1000) - 100); 
            const sig = await generateSig(signaturePath, key, expiredTime, secret);

            // Send request with expired timestamp and matching signature
            const res = await app.request(`http://localhost${requestPath}?key=${key}&expires=${expiredTime}&sig=${sig}`, {
                method: "PUT",
                body: new ArrayBuffer(10)
            }, mockEnv);
            
            expect(res.status).toBe(403);
        });
        
        it("should reject invalid bucket", async () => {
             const res = await app.request(`http://localhost/upload-signed/fakebucket?key=foo&expires=1&sig=1`, {
                method: "PUT",
                body: new ArrayBuffer(10)
            }, mockEnv);
            expect(res.status).toBe(400);
        });

        it("should reject missing parameters", async () => {
            const res = await app.request(`http://localhost/upload-signed/public?key=foo`, {
               method: "PUT",
               body: new ArrayBuffer(10)
           }, mockEnv);
           expect(res.status).toBe(400);
       });
    });
    
    describe("Error Handling", () => {
         it("should reject queue auth when INTERNAL_API_TOKEN is not set", async () => {
            const envWithoutToken = { ...mockEnv, INTERNAL_API_TOKEN: "" };
            const res = await app.request("http://localhost/queue/pending", {
                method: "GET",
                headers: { "Authorization": "Bearer some-token" }
            }, envWithoutToken);
            
            expect(res.status).toBe(401);
        });
    });
});
