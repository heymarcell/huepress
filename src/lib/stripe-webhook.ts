/**
 * Stripe Webhook Signature Verification for Cloudflare Workers
 * Uses Web Crypto API (crypto.subtle) which is available in Workers runtime
 */

const EXPECTED_SCHEME = "v1";
const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Parses the Stripe-Signature header
 * Format: t=timestamp,v1=signature
 */
function parseSignatureHeader(header: string): {
  timestamp: number;
  signatures: string[];
} {
  const pairs = header.split(",");
  let timestamp = 0;
  const signatures: string[] = [];

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === EXPECTED_SCHEME) {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

/**
 * Computes HMAC-SHA256 signature using Web Crypto API
 */
async function computeSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Import the secret key
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  // Convert to hex string
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verifies a Stripe webhook signature
 *
 * @param payload - The raw request body as a string
 * @param signature - The Stripe-Signature header value
 * @param secret - The webhook endpoint secret (whsec_...)
 * @returns VerificationResult indicating if signature is valid
 */
export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<VerificationResult> {
  // Parse the signature header
  const { timestamp, signatures } = parseSignatureHeader(signature);

  if (!timestamp) {
    return { valid: false, error: "Missing timestamp in signature header" };
  }

  if (signatures.length === 0) {
    return { valid: false, error: "No valid signature found in header" };
  }

  // Check timestamp to prevent replay attacks
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentTimestamp - timestamp);

  if (timeDifference > TIMESTAMP_TOLERANCE_SECONDS) {
    return {
      valid: false,
      error: `Timestamp outside tolerance window (${timeDifference}s difference)`,
    };
  }

  // Compute expected signature
  // Stripe uses: HMAC_SHA256(timestamp + "." + payload)
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = await computeSignature(signedPayload, secret);

  // Check if any provided signature matches
  for (const sig of signatures) {
    if (secureCompare(expectedSignature, sig)) {
      return { valid: true };
    }
  }

  return { valid: false, error: "Signature mismatch" };
}
