import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { 
  sendGA4Event, 
  trackGA4Purchase, 
  trackGA4Signup, 
  trackGA4Lead 
} from "@/lib/ga4-conversions";

describe("GA4 Conversions API", () => {
  const mockMeasurementId = "G-TESTID123";
  const mockApiSecret = "test_api_secret";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sendGA4Event", () => {
    it("should send event successfully when API returns 204", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      const result = await sendGA4Event(mockMeasurementId, mockApiSecret, {
        eventName: "test_event",
        params: { key: "value" },
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
      
      // Verify URL structure
      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain("google-analytics.com/mp/collect");
      expect(callUrl).toContain(`measurement_id=${mockMeasurementId}`);
      expect(callUrl).toContain(`api_secret=${mockApiSecret}`);
    });

    it("should send event successfully when API returns 200", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      const result = await sendGA4Event(mockMeasurementId, mockApiSecret, {
        eventName: "test_event",
        params: {},
      });

      expect(result.success).toBe(true);
    });

    it("should include user_id when provided", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      await sendGA4Event(mockMeasurementId, mockApiSecret, {
        eventName: "test_event",
        params: {},
        userId: "user_123",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.user_id).toBe("user_123");
    });

    it("should return error when API fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 400,
        ok: false,
        text: () => Promise.resolve("Bad Request"),
      } as Response);

      const result = await sendGA4Event(mockMeasurementId, mockApiSecret, {
        eventName: "test_event",
        params: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("400");
    });

    it("should handle network errors gracefully", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await sendGA4Event(mockMeasurementId, mockApiSecret, {
        eventName: "test_event",
        params: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("trackGA4Purchase", () => {
    it("should send purchase event with correct parameters", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      const result = await trackGA4Purchase(mockMeasurementId, mockApiSecret, {
        transactionId: "txn_123",
        value: 45.00,
        currency: "USD",
        userId: "user_456",
        itemName: "HuePress Annual",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.events[0].name).toBe("purchase");
      expect(requestBody.events[0].params.transaction_id).toBe("txn_123");
      expect(requestBody.events[0].params.value).toBe(45.00);
      expect(requestBody.events[0].params.currency).toBe("USD");
    });
  });

  describe("trackGA4Signup", () => {
    it("should send signup event with user ID", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      const result = await trackGA4Signup(mockMeasurementId, mockApiSecret, {
        userId: "user_789",
        method: "email",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.events[0].name).toBe("sign_up");
      expect(requestBody.events[0].params.method).toBe("email");
    });

    it("should default method to email", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      await trackGA4Signup(mockMeasurementId, mockApiSecret, {
        userId: "user_789",
      });

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.events[0].params.method).toBe("email");
    });
  });

  describe("trackGA4Lead", () => {
    it("should send lead event with source", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      const result = await trackGA4Lead(mockMeasurementId, mockApiSecret, {
        source: "newsletter",
      });

      expect(result.success).toBe(true);

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.events[0].name).toBe("generate_lead");
      expect(requestBody.events[0].params.lead_source).toBe("newsletter");
    });

    it("should default source to website", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 204,
        ok: true,
        text: () => Promise.resolve(""),
      } as Response);

      await trackGA4Lead(mockMeasurementId, mockApiSecret, {});

      const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(requestBody.events[0].params.lead_source).toBe("website");
    });
  });
});
