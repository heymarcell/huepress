import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendPinterestEvent,
  trackPinterestCheckout,
  trackPinterestSignup,
  trackPinterestLead,
} from "@/lib/pinterest-conversions";

describe("Pinterest Conversions API", () => {
  const mockAccessToken = "test_access_token";
  const mockAdAccountId = "123456789";
  const mockSiteUrl = "https://huepress.co";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sendPinterestEvent", () => {
    it("should send event successfully", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      const result = await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "checkout",
        email: "test@example.com",
        value: 45,
        currency: "USD",
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();

      // Verify URL structure
      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("api.pinterest.com");
      expect(callUrl).toContain(mockAdAccountId);
      expect(callUrl).toContain("/events");
    });

    it("should include Authorization header with Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "lead",
      });

      const requestHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
      expect(requestHeaders["Authorization"]).toBe(`Bearer ${mockAccessToken}`);
    });

    it("should hash email before sending", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "checkout",
        email: "Test@Example.com",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const userData = requestBody.data[0].user_data;
      
      // Email should be hashed (SHA-256 = 64 char hex string) and in array format
      expect(userData.em).toBeInstanceOf(Array);
      expect(userData.em[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should hash external_id before sending", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "signup",
        externalId: "user_123",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const userData = requestBody.data[0].user_data;
      
      expect(userData.external_id).toBeInstanceOf(Array);
      expect(userData.external_id[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should format value as string for Pinterest", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "checkout",
        value: 45.5,
        currency: "USD",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const customData = requestBody.data[0].custom_data;
      
      // Pinterest requires value as string
      expect(customData.value).toBe("45.50");
      expect(typeof customData.value).toBe("string");
    });

    it("should include partner_name", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "lead",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].partner_name).toBe("ss-huepress");
    });

    it("should return error when API fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Invalid token" }),
      } as Response);

      const result = await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "checkout",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("should handle network errors gracefully", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendPinterestEvent(mockAccessToken, mockAdAccountId, {
        eventName: "checkout",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("trackPinterestCheckout", () => {
    it("should send checkout event with correct data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      const result = await trackPinterestCheckout(mockAccessToken, mockAdAccountId, mockSiteUrl, {
        email: "buyer@example.com",
        value: 45,
        currency: "USD",
        orderId: "sub_123",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("checkout");
    });
  });

  describe("trackPinterestSignup", () => {
    it("should send signup event", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      const result = await trackPinterestSignup(mockAccessToken, mockAdAccountId, mockSiteUrl, {
        email: "newuser@example.com",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("signup");
    });
  });

  describe("trackPinterestLead", () => {
    it("should send lead event", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ num_events_received: 1 }),
      } as Response);

      const result = await trackPinterestLead(mockAccessToken, mockAdAccountId, mockSiteUrl, {
        email: "lead@example.com",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("lead");
    });
  });
});
