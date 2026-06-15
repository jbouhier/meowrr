export const STRIPE_BALANCE_URL = "https://api.stripe.com/v1/balance";

export async function validateStripeKey(fetchImpl, key) {
  if (!key || key.trim() === "") {
    return { ok: false, error: "missing_key" };
  }

  try {
    const res = await fetchImpl(STRIPE_BALANCE_URL, {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (res.ok) {
      return { ok: true, error: null };
    }

    if (res.status === 401) {
      return { ok: false, error: "invalid_key" };
    }

    return { ok: false, error: `stripe_error_${res.status}` };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
