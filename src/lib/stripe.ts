// Stripe client utilities 
// Uses the Checkout Session URL redirect approach (no Stripe.js SDK needed for checkout)
import { apiClient } from "@/lib/api-client";

export async function createCheckoutSession(priceId: string, authToken: string, email?: string) {
  try {
    const data = await apiClient.billing.createCheckout(priceId, authToken, email);
    // Redirect to Stripe Checkout page
    window.location.href = data.url;
  } catch (error) {
    console.error("Checkout error:", error);
    throw new Error("Failed to create checkout session");
  }
}

export async function createPortalSession(authToken: string) {
  try {
    const data = await apiClient.billing.createPortal(authToken);
    window.location.href = data.url;
  } catch (error) {
    console.error("Portal error:", error);
    throw new Error("Failed to create portal session");
  }
}
