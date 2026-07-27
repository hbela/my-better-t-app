import Stripe from "stripe";
import { AppError } from "../errors/AppError";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

let client: Stripe | null = null;

/**
 * Returns the shared Stripe client, constructing it on first use.
 *
 * Stripe is an optional integration: the server must boot without
 * STRIPE_SECRET_KEY. Constructing the client at module load made a missing
 * key a fatal startup crash, so it is deferred to the first API call and
 * surfaced as a normal request error instead.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError(
      "Payment system not configured. Please contact support.",
      "PAYMENT_NOT_CONFIGURED",
      500
    );
  }

  client = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  return client;
}

/** Whether Stripe is configured, for callers that want to degrade gracefully. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
