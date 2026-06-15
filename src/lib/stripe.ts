export const STRIPE_BALANCE_URL = "https://api.stripe.com/v1/balance";

export interface StripeValidationResult {
  ok: boolean;
  error: string | null;
}

export async function validateStripeKey(
  fetchImpl: typeof fetch,
  key: string | undefined
): Promise<StripeValidationResult> {
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
