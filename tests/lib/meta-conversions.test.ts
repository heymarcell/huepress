import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendMetaEvent,
  trackPurchase,
  trackSubscribe,
  trackLead,
  trackCompleteRegistration,
} from "@/lib/meta-conversions";

describe("Meta Conversions API", () => {
  const mockAccessToken = "test_access_token";
  const mockPixelId = "123456789";
  const mockSiteUrl = "https://huepress.co";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sendMetaEvent", () => {
    it("should send event successfully", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      const result = await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
        email: "test@example.com",
        value: 45,
        currency: "USD",
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();

      // Verify URL structure
      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("graph.facebook.com");
      expect(callUrl).toContain(mockPixelId);
      expect(callUrl).toContain("/events");
    });

    it("should hash email before sending", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Lead",
        email: "Test@Example.com",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const userData = requestBody.data[0].user_data;
      
      // Email should be hashed (SHA-256 = 64 char hex string)
      expect(userData.em).toMatch(/^[a-f0-9]{64}$/);
      // Should be lowercase + trimmed before hashing
      expect(userData.em).not.toContain("Test");
    });

    it("should hash external_id before sending", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
        externalId: "user_123",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const userData = requestBody.data[0].user_data;
      
      expect(userData.external_id).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should include fbp and fbc cookies when provided", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
        fbp: "fb.1.1234567890.1234567890",
        fbc: "fb.1.1234567890.AbCdEfGhIjKl",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const userData = requestBody.data[0].user_data;
      
      expect(userData.fbp).toBe("fb.1.1234567890.1234567890");
      expect(userData.fbc).toBe("fb.1.1234567890.AbCdEfGhIjKl");
    });

    it("should include test_event_code when provided", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Lead",
        testEventCode: "TEST12345",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.test_event_code).toBe("TEST12345");
    });

    it("should return error when API fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Invalid token" } }),
      } as Response);

      const result = await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("should handle network errors gracefully", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should include custom_data when value and currency provided", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      await sendMetaEvent(mockAccessToken, mockPixelId, {
        eventName: "Purchase",
        value: 45.00,
        currency: "USD",
        orderId: "order_123",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const customData = requestBody.data[0].custom_data;
      
      expect(customData.value).toBe(45.00);
      expect(customData.currency).toBe("USD");
      expect(customData.order_id).toBe("order_123");
    });
  });

  describe("trackPurchase", () => {
    it("should send purchase event with correct data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      const result = await trackPurchase(mockAccessToken, mockPixelId, mockSiteUrl, {
        email: "buyer@example.com",
        value: 45,
        currency: "USD",
        orderId: "sub_123",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("Purchase");
    });
  });

  describe("trackSubscribe", () => {
    it("should send subscribe event", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      const result = await trackSubscribe(mockAccessToken, mockPixelId, mockSiteUrl, {
        email: "subscriber@example.com",
        value: 5,
        currency: "USD",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("Subscribe");
    });
  });

  describe("trackLead", () => {
    it("should send lead event", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      const result = await trackLead(mockAccessToken, mockPixelId, mockSiteUrl, {
        email: "lead@example.com",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("Lead");
    });
  });

  describe("trackCompleteRegistration", () => {
    it("should send registration event", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events_received: 1 }),
      } as Response);

      const result = await trackCompleteRegistration(mockAccessToken, mockPixelId, mockSiteUrl, {
        email: "newuser@example.com",
        externalId: "clerk_user_123",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.data[0].event_name).toBe("CompleteRegistration");
    });
  });
});
