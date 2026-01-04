import { Context } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Bindings } from "../types";

/**
 * Comprehensive Admin Verification
 * 
 * Implements defense-in-depth:
 * 1. Checks Clerk session claims for admin role
 * 2. Falls back to Clerk Backend API if needed
 * 3. Validates against ADMIN_EMAILS allowlist if configured
 */
export async function verifyAdmin(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  // Try 0: Check for API Key (Machine-to-Machine) first
  // This allows the Desktop App to authenticate without a user session
  const apiKeyHeader = c.req.header("X-Admin-Key");
  if (apiKeyHeader && c.env.ADMIN_API_KEY && apiKeyHeader === c.env.ADMIN_API_KEY) {
    return true;
  }

  const auth = getAuth(c);
  if (!auth?.userId) return false;

  // Try 1: Check Clerk publicMetadata.role from session claims
  // This works if custom claims are configured in Clerk Dashboard
  const sessionClaims = auth.sessionClaims as { publicMetadata?: { role?: string } } | undefined;
  const isAdminFromClaims = sessionClaims?.publicMetadata?.role === 'admin';

  // Check if allowlist is configured for defense-in-depth
  const adminEmailsEnv = c.env.ADMIN_EMAILS?.trim();
  const adminEmails = adminEmailsEnv ? adminEmailsEnv.split(',').map(e => e.trim().toLowerCase()) : [];
  const hasAllowlist = adminEmails.length > 0;

  // If admin from claims AND no allowlist configured, allow immediately (backwards compatible)
  if (isAdminFromClaims && !hasAllowlist) {
    if (c.env.ENVIRONMENT === 'production') {
       console.warn(`[Security] Admin access granted via metadata but ADMIN_EMAILS allowlist is not configured.`);
    }
    return true;
  }

  // Try 2: Fallback to Clerk Backend API (required if allowlist is configured or claims don't confirm admin)
  let isAdminRole = isAdminFromClaims;
  let userEmail: string | null = null;
  
  try {
    const clerkSecretKey = c.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      return false;
    }
    
    const response = await fetch(`https://api.clerk.com/v1/users/${auth.userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Clerk API error:", response.status);
      return false;
    }
    
    const userData = await response.json() as { 
      public_metadata?: { role?: string };
      email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
      primary_email_address_id?: string;
    };
    
    // Check role from API if not already confirmed
    if (!isAdminRole && userData?.public_metadata?.role === 'admin') {
      isAdminRole = true;
    }
    
    // Extract primary verified email for allowlist check
    const primaryEmail = userData.email_addresses?.find(
      e => e.verification?.status === 'verified'
    );
    userEmail = primaryEmail?.email_address || null;
    
  } catch (e) {
    console.error("Admin verification failed:", e);
    return false;
  }
  
  // Defense-in-depth: If allowlist is configured, require email to be on it
  if (hasAllowlist && isAdminRole) {
    if (!userEmail) {
      console.warn(`[Security] Admin user has no verified email for allowlist check`);
      return false;
    }
    const isOnAllowlist = adminEmails.includes(userEmail.toLowerCase());
    if (!isOnAllowlist) {
      console.warn(`[Security] User ${userEmail} has admin role but is not on ADMIN_EMAILS allowlist`);
      return false;
    }
  }
  
  return isAdminRole;
}
