import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { Bindings } from "../../src/api/types";

// Mock @cloudflare/containers
vi.mock("@cloudflare/containers", () => ({
    Container: class {},
    getContainer: vi.fn(),
}));

import { 
    callProcessingContainer,
    generateOgImageViaContainer,
    generatePdfViaContainer,
    generateThumbnailViaContainer
} from "../../src/lib/processing-container";
import { getContainer } from "@cloudflare/containers";

describe("Processing Container", () => {
    let mockEnv: Partial<Bindings>;
    let mockFetch: Mock;
    
    beforeEach(() => {
        mockFetch = vi.fn();
        vi.mocked(getContainer).mockReturnValue({
            fetch: mockFetch
        } as unknown as ReturnType<typeof getContainer>);
        
        mockEnv = {
            PROCESSING: {} as Bindings["PROCESSING"],
        };
    });

    describe("callProcessingContainer", () => {
        it("should call container with correct path and body", async () => {
            mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
            
            const response = await callProcessingContainer(
                mockEnv as Bindings,
                "/test-path",
                { key: "value" }
            );
            
            expect(mockFetch).toHaveBeenCalledWith(
                "http://container/test-path",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "value" }),
                })
            );
            expect(response.status).toBe(200);
        });

        it("should use 'main' as container instance name", async () => {
            mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
            
            await callProcessingContainer(mockEnv as Bindings, "/path", {});
            
            expect(getContainer).toHaveBeenCalledWith(mockEnv.PROCESSING, "main");
        });
    });

    describe("generateOgImageViaContainer", () => {
        it("should return image data on success", async () => {
            const mockResponse = { imageBase64: "abc123", mimeType: "image/png" };
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify(mockResponse), { status: 200 })
            );
            
            const result = await generateOgImageViaContainer(
                mockEnv as Bindings,
                "Test Title",
                "base64data",
                "image/webp"
            );
            
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                "http://container/og-image",
                expect.objectContaining({
                    body: JSON.stringify({
                        title: "Test Title",
                        thumbnailBase64: "base64data",
                        thumbnailMimeType: "image/webp",
                    }),
                })
            );
        });

        it("should throw on container error", async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: "Generation failed" }), { status: 500 })
            );
            
            await expect(
                generateOgImageViaContainer(mockEnv as Bindings, "Title", "data", "image/png")
            ).rejects.toThrow("Container OG generation failed: Generation failed");
        });
    });

    describe("generatePdfViaContainer", () => {
        it("should return PDF data on synchronous success", async () => {
            const mockResponse = { pdfBase64: "pdf123", mimeType: "application/pdf", filename: "test.pdf" };
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify(mockResponse), { status: 200 })
            );
            
            const result = await generatePdfViaContainer(
                mockEnv as Bindings,
                "<svg></svg>",
                "test.pdf",
                { title: "Test", assetId: "123", description: "Desc", qrCodeUrl: "https://example.com" }
            );
            
            expect(result).toEqual(mockResponse);
        });

        it("should return void on async 202 response", async () => {
            mockFetch.mockResolvedValue(
                new Response(null, { status: 202 })
            );
            
            const result = await generatePdfViaContainer(
                mockEnv as Bindings,
                "<svg></svg>",
                "test.pdf",
                undefined,
                { uploadUrl: "https://upload.example.com", uploadToken: "token123" }
            );
            
            expect(result).toBeUndefined();
        });

        it("should include asyncOptions in request body", async () => {
            mockFetch.mockResolvedValue(
                new Response(null, { status: 202 })
            );
            
            await generatePdfViaContainer(
                mockEnv as Bindings,
                "<svg></svg>",
                "async.pdf",
                { title: "Async" },
                { uploadUrl: "https://upload.test", uploadToken: "secret" }
            );
            
            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody).toHaveProperty("uploadUrl", "https://upload.test");
            expect(callBody).toHaveProperty("uploadToken", "secret");
        });

        it("should throw on container error", async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: "PDF failed" }), { status: 500 })
            );
            
            await expect(
                generatePdfViaContainer(mockEnv as Bindings, "<svg></svg>", "test.pdf")
            ).rejects.toThrow("Container PDF generation failed: PDF failed");
        });
    });

    describe("generateThumbnailViaContainer", () => {
        it("should return thumbnail data on success", async () => {
            const mockResponse = { imageBase64: "thumb123", mimeType: "image/webp" };
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify(mockResponse), { status: 200 })
            );
            
            const result = await generateThumbnailViaContainer(
                mockEnv as Bindings,
                "<svg></svg>",
                512
            );
            
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                "http://container/thumbnail",
                expect.objectContaining({
                    body: JSON.stringify({ svgContent: "<svg></svg>", width: 512 }),
                })
            );
        });

        it("should use default width of 1024", async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ imageBase64: "x", mimeType: "image/webp" }), { status: 200 })
            );
            
            await generateThumbnailViaContainer(mockEnv as Bindings, "<svg></svg>");
            
            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.width).toBe(1024);
        });

        it("should throw on container error", async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: "Thumbnail failed" }), { status: 500 })
            );
            
            await expect(
                generateThumbnailViaContainer(mockEnv as Bindings, "<svg></svg>")
            ).rejects.toThrow("Container Thumbnail generation failed: Thumbnail failed");
        });
    });
});
