// Stripe client utilities 
// Uses the Checkout Session URL redirect approach (no Stripe.js SDK needed for checkout)

export async function createCheckoutSession(priceId: string) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  const data = await response.json() as { url: string };
  
  // Redirect to Stripe Checkout page
  window.location.href = data.url;
}

export async function createPortalSession() {
  const response = await fetch("/api/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to create portal session");
  }

  const data = await response.json() as { url: string };
  window.location.href = data.url;
}
