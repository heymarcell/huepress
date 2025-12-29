import { Bindings } from "../types";

/**
 * Generate a signed upload URL for the internal API.
 * This allows the container to upload specific files without holding the global INTERNAL_API_TOKEN.
 * 
 * Signature = HMAC_SHA256(path + expiration, SECRET)
 */
export async function generateSignedUploadUrl(
  env: Bindings, 
  bucket: 'public' | 'private', 
  key: string, 
  expiresInSeconds: number = 3600
): Promise<string> {
  const expiration = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const baseUrl = env.API_URL || "https://api.huepress.co";
  const path = `/api/internal/upload-signed/${bucket}`;
  
  const dataToSign = `${path}:${key}:${expiration}`;
  const signature = await signData(dataToSign, env.INTERNAL_API_TOKEN);
  
  const url = new URL(baseUrl + path);
  url.searchParams.set("key", key);
  url.searchParams.set("expires", expiration.toString());
  url.searchParams.set("sig", signature);
  
  return url.toString();
}

/**
 * Verify a signed request.
 * Returns true if valid, false otherwise.
 */
export async function verifySignedRequest(
  env: Bindings, 
  bucket: 'public' | 'private', 
  key: string, 
  expirationStr: string, 
  providedSignature: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const expiration = parseInt(expirationStr);
  
  if (isNaN(expiration) || expiration < now) {
    return false; // Expired
  }
  
  const path = `/api/internal/upload-signed/${bucket}`;
  const dataToSign = `${path}:${key}:${expiration}`;
  const expectedSignature = await signData(dataToSign, env.INTERNAL_API_TOKEN);
  
  return expectedSignature === providedSignature;
}

/**
 * Generate HMAC-SHA256 hex signature
 */
async function signData(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw", 
    keyData, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC", 
    cryptoKey, 
    messageData
  );
  
  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
