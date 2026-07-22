# Testing with Stripe

Seed realistic data in Stripe **test-mode** account to test polling, parsing and displays revenue.

## Why seeding is necessary

A fresh test account shows `$0.00`, which is indistinguishable from a broken poll. You need data — but not the data most people reach for first.

> [!IMPORTANT]
> MeowRR does not read sales. It calls exactly one endpoint, `GET /v1/subscriptions`, and never touches charges, payment intents, or invoices.

So running one-off test checkouts with card `4242 4242 4242 4242` produces **no change in the widget**. What you need is *active recurring subscriptions*.

## Setup

1. Get a test key from the [Stripe test API keys page](https://dashboard.stripe.com/test/apikeys). A restricted key (`rk_test_…`) with read access to subscriptions mirrors what real users are told to use; a `sk_test_…` secret key is required for seeding, since seeding writes.
2. Export it:

```bash
export STRIPE_SECRET_KEY=sk_test_...
```

The script refuses to run against anything that is not `sk_test_` or `rk_test_`. It creates and deletes data — never point it at a live key.

## Commands

```bash
bun run seed
```

| Command | Effect |
| --- | --- |
| `bun run seed` | Creates the standard spread of six subscriptions |
| `bun run seed --count 120` | Adds 120 more, to push past Stripe's 100-per-page limit |
| `bun run seed --verify` | Recomputes expected MRR from the account; creates nothing |
| `bun run seed --cleanup` | Deletes the customers it created |

## What gets created

Six subscriptions, each chosen to exercise a different branch of the interval math in [`src/lib/stripe.ts`](../src/lib/stripe.ts):

| Plan | Exercises |
| --- | --- |
| Monthly $29 | the baseline case |
| Monthly $15 × 3 seats | `quantity` multiplication |
| Yearly $290 | division by 12 |
| Weekly $10 | the ×52/12 conversion |
| Every 3 months $60 | `interval_count` > 1 |
| Daily $1 | the ×365/12 conversion |

Customers are created with `pm_card_visa` attached as their default payment method, and subscriptions use `payment_behavior: error_if_incomplete`, so they land `active` rather than `incomplete`.

## Verifying the number

After seeding, the script totals MRR across your whole account and prints what the widget should display:

```
Counted 6 billable item(s), skipped 0 inactive subscription(s).

MeowRR should display:  MRR $191.92
                        ARR $2,303.04
```

That total is computed by a **second, independent implementation** of the app's `monthlyAmount` function. This is deliberate: importing the app's version would make a bug in it invisible, because it would simply agree with itself. If the script and the widget disagree, one of them has a real bug.

Then run the app and compare:

```bash
bun tauri dev
```

Open settings, paste the test key, save. The Tauri CSP already allows `https://api.stripe.com`, so no config change is needed.

## Gotchas

These will each make a working app look broken:

- **Trials and incomplete subscriptions count as zero.** Only `active` and `past_due` contribute. A subscription created with a trial reads as `$0.00`.
- **One non-USD subscription fails the entire fetch.** The app does not skip foreign-currency subs — it returns `unsupported_data` and shows an error banner instead of a partial total. Same for any discounted or coupon-bearing subscription, and any tiered price.
- **The chart will not fill in during a smoke test.** History keeps one snapshot per calendar day, so a single session produces a single point regardless of how many times it polls. Testing the sparkline requires either waiting days or hand-editing the `meowrr_metric_snapshots` key in localStorage.
- **Other subscriptions in the account still count.** The printed total covers everything Stripe returns, not just what the script made.

## Cleanup

```bash
bun run seed --cleanup
```

Created customer IDs are recorded in `.stripe-seed.json` at the repo root (gitignored). Cleanup reads that file rather than querying Stripe, so it is exact and immediate — but it only knows about customers created on this machine. Deleting a customer removes its subscriptions too. Seeded products and prices remain, because Stripe cannot delete a price that has been used; they are inert.

## What this does not cover

Seeding proves the happy path: authentication, pagination, the `expand` parameter, and the interval math. It cannot exercise the failure branches, because Stripe will not return `429` or `500` on demand. Those paths — `rate_limited`, `provider_unavailable`, and `retry-after` parsing — are covered by the unit tests in [`src/lib/stripe.test.ts`](../src/lib/stripe.test.ts), which inject a fake `fetch`.

Testing those failure branches end to end through the UI would require pointing the app at a local mock server. That is not currently possible without code changes: the endpoint is a hard-coded constant, and the Tauri CSP `connect-src` allows only `https://api.stripe.com`.
