import { type FetchLike, fetchStripeMetrics } from "./lib/stripe"
import type {
  PaymentMetrics,
  PaymentProviderId,
  PaymentRequestOptions,
  PaymentResult,
} from "./types"

export interface PaymentProviderAdapter {
  id: PaymentProviderId
  label: string
  fetchMetrics(
    fetchImpl: FetchLike,
    credential: string | undefined,
    options?: PaymentRequestOptions
  ): Promise<PaymentResult<PaymentMetrics>>
}

export const stripeProvider: PaymentProviderAdapter = {
  fetchMetrics: fetchStripeMetrics,
  id: "stripe",
  label: "Stripe",
}
