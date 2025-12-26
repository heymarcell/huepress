import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { Webhook } from "svix";
import app from "../../src/api/routes/webhooks";

// Mock Svix to avoid real signature verification
vi.mock("svix", () => ({
    Webhook: vi.fn(),
}));

describe("Webhooks API", () => {
    let mockEnv: Record<string, unknown>;
    let mockPrepare: Mock;
    let mockBind: Mock;
    let mockRun: Mock;
    let mockVerify: Mock;

    beforeEach(() => {
        mockRun = vi.fn();
        mockBind = vi.fn();
        mockPrepare = vi.fn();
        
        const mockStatement = {
            bind: mockBind,
            run: mockRun
        };
        mockPrepare.mockReturnValue(mockStatement);
        mockBind.mockReturnValue(mockStatement);

        mockVerify = vi.fn();
        (Webhook as unknown as Mock).mockImplementation(function() {
            return { verify: mockVerify };
        });

        mockEnv = {
            CLERK_WEBHOOK_SECRET: "test-secret",
            DB: { prepare: mockPrepare },
            // Add other env vars if needed (GA4, Meta) to avoid errors
        };
    });

    it("should sync unverified users with NULL email on user.created", async () => {
        // Mock Payload: Unverified Email
        const payload = {
            type: "user.created",
            data: {
                id: "user_123",
                email_addresses: [
                    { 
                        email_address: "admin@huepress.co",
                        id: "email_1",
                        verification: { status: "unverified" }
                    }
                ],
                primary_email_address_id: "email_1"
            }
        };

        mockVerify.mockReturnValue(payload);

        const res = await app.request("http://localhost/clerk", {
            method: "POST",
            headers: {
                "svix-id": "1",
                "svix-timestamp": "1",
                "svix-signature": "1"
            },
            body: JSON.stringify(payload)
        }, mockEnv);

        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data).toHaveProperty("type", "user.created");

        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT"));
        expect(mockBind).toHaveBeenCalledWith(
             expect.any(String), // UUID
             null, // Email should be null
             "user_123"
        );
    });

    it("should accept verified emails on user.created", async () => {
         const payload = {
            type: "user.created",
            data: {
                id: "user_123",
                email_addresses: [
                    { 
                        email_address: "admin@huepress.co",
                        id: "email_1",
                        verification: { status: "verified" }
                    }
                ],
                primary_email_address_id: "email_1"
            }
        };
        mockVerify.mockReturnValue(payload);

        await app.request("http://localhost/clerk", {
             method: "POST",
             headers: { "svix-id": "1", "svix-timestamp": "1", "svix-signature": "1" },
             body: JSON.stringify(payload)
        }, mockEnv);

        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT"));
        expect(mockBind).toHaveBeenCalledWith(
            expect.any(String), // UUID
            "admin@huepress.co",
            "user_123"
        );
    });
    
    it("should update email on user.updated when verified", async () => {
        const payload = {
            type: "user.updated",
            data: {
                id: "user_123",
                email_addresses: [
                    { 
                        email_address: "verified@huepress.co",
                        id: "email_1",
                        verification: { status: "verified" }
                    }
                ],
                primary_email_address_id: "email_1"
            }
        };
        mockVerify.mockReturnValue(payload);

        await app.request("http://localhost/clerk", {
             method: "POST",
             headers: { "svix-id": "1", "svix-timestamp": "1", "svix-signature": "1" },
             body: JSON.stringify(payload)
        }, mockEnv);

        // Expect Update
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE users"));
        expect(mockBind).toHaveBeenCalledWith("verified@huepress.co", "user_123");
    });
});
