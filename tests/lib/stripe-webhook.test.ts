import { describe, it, expect } from "vitest";
import { verifyStripeSignature } from "@/lib/stripe-webhook";

// Test secret for signing test payloads
const TEST_SECRET = "whsec_test_secret_key_12345";

/**
 * Helper to create a valid Stripe signature header
 */
async function createSignature(
  payload: string,
  secret: string,
  timestamp?: number
): Promise<{ header: string; timestamp: number }> {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;

  // Compute HMAC-SHA256 using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    header: `t=${ts},v1=${signature}`,
    timestamp: ts,
  };
}

describe("verifyStripeSignature", () => {
  const testPayload = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_123" } },
  });

  it("should accept a valid signature", async () => {
    const { header } = await createSignature(testPayload, TEST_SECRET);

    const result = await verifyStripeSignature(testPayload, header, TEST_SECRET);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject an invalid signature", async () => {
    const { header } = await createSignature(testPayload, TEST_SECRET);
    const tamperedHeader = header.replace(/v1=[a-f0-9]+/, "v1=invalid_sig");

    const result = await verifyStripeSignature(testPayload, tamperedHeader, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("should reject a tampered payload", async () => {
    const { header } = await createSignature(testPayload, TEST_SECRET);
    const tamperedPayload = testPayload.replace("cs_test_123", "cs_malicious");

    const result = await verifyStripeSignature(tamperedPayload, header, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });

  it("should reject an expired timestamp", async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const { header } = await createSignature(testPayload, TEST_SECRET, expiredTimestamp);

    const result = await verifyStripeSignature(testPayload, header, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Timestamp outside tolerance window");
  });

  it("should reject missing timestamp", async () => {
    const header = "v1=somesignature";

    const result = await verifyStripeSignature(testPayload, header, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing timestamp in signature header");
  });

  it("should reject missing signature", async () => {
    const header = "t=1234567890";

    const result = await verifyStripeSignature(testPayload, header, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("No valid signature found in header");
  });

  it("should reject signature signed with wrong secret", async () => {
    const { header } = await createSignature(testPayload, "wrong_secret");

    const result = await verifyStripeSignature(testPayload, header, TEST_SECRET);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Signature mismatch");
  });
});
