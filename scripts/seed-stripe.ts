/**
 * Seeds a Stripe **test-mode** account with active subscriptions so MeowRR has
 * something to poll, then prints the MRR the widget is expected to display.
 *
 * The expected-MRR math here is deliberately a second, independent
 * implementation of `monthlyAmount` in src/lib/stripe.ts. Importing the app's
 * version would make a bug in it invisible — it would simply agree with itself.
 *
 *   bun run scripts/seed-stripe.ts               # seed the standard spread
 *   bun run scripts/seed-stripe.ts --count 120   # + 120 extras (pagination)
 *   bun run scripts/seed-stripe.ts --verify      # recompute MRR, seed nothing
 *   bun run scripts/seed-stripe.ts --cleanup     # delete what this script made
 */

import { readFile, writeFile } from "node:fs/promises"

const API = "https://api.stripe.com/v1"
const LEDGER = new URL("../.stripe-seed.json", import.meta.url).pathname
const SEED_TAG = "meowrr_seed"

type Json = Record<string, unknown>

interface SeedPlan {
  nickname: string
  interval: "day" | "week" | "month" | "year"
  intervalCount: number
  unitAmount: number
  quantity: number
}

/** Each entry exercises a different branch of the app's interval math. */
const PLANS: SeedPlan[] = [
  { nickname: "Monthly $29", interval: "month", intervalCount: 1, unitAmount: 2900, quantity: 1 },
  {
    nickname: "Monthly x3 seats",
    interval: "month",
    intervalCount: 1,
    unitAmount: 1500,
    quantity: 3,
  },
  { nickname: "Yearly $290", interval: "year", intervalCount: 1, unitAmount: 29000, quantity: 1 },
  { nickname: "Weekly $10", interval: "week", intervalCount: 1, unitAmount: 1000, quantity: 1 },
  {
    nickname: "Every 3 months $60",
    interval: "month",
    intervalCount: 3,
    unitAmount: 6000,
    quantity: 1,
  },
  { nickname: "Daily $1", interval: "day", intervalCount: 1, unitAmount: 100, quantity: 1 },
]

/** Mirrors src/lib/stripe.ts monthlyAmount — intentionally reimplemented. */
function monthlyMinorUnits(plan: SeedPlan): number {
  const perInterval = plan.unitAmount * plan.quantity
  switch (plan.interval) {
    case "day":
      return (perInterval * (365 / 12)) / plan.intervalCount
    case "week":
      return (perInterval * (52 / 12)) / plan.intervalCount
    case "month":
      return perInterval / plan.intervalCount
    case "year":
      return perInterval / (12 * plan.intervalCount)
  }
}

function encode(payload: Json, prefix = ""): string[][] {
  const pairs: string[][] = []
  for (const [rawKey, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry && typeof entry === "object")
          pairs.push(...encode(entry as Json, `${key}[${index}]`))
        else pairs.push([`${key}[${index}]`, String(entry)])
      })
    } else if (typeof value === "object") {
      pairs.push(...encode(value as Json, key))
    } else {
      pairs.push([key, String(value)])
    }
  }
  return pairs
}

class StripeError extends Error {}

async function stripe(
  key: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  payload: Json = {}
) {
  const body = new URLSearchParams(encode(payload))
  const url = method === "GET" ? `${API}${path}?${body}` : `${API}${path}`

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
      },
      body: method === "GET" ? undefined : body,
    })

    if (response.status === 429) {
      const wait = 2 ** attempt * 500
      console.warn(`  rate limited, retrying in ${wait}ms`)
      await new Promise((resolve) => setTimeout(resolve, wait))
      continue
    }

    const json = (await response.json()) as Json
    if (!response.ok) {
      const error = (json.error ?? {}) as { message?: string }
      throw new StripeError(`${method} ${path} → ${response.status}: ${error.message ?? "unknown"}`)
    }
    return json
  }
  throw new StripeError(`${method} ${path} → still rate limited after 5 attempts`)
}

/** Refuses anything that is not an explicitly test-mode key. */
function requireTestKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set.\n")
    console.error("Get a test key at https://dashboard.stripe.com/test/apikeys")
    console.error("then:  export STRIPE_SECRET_KEY=sk_test_...")
    process.exit(1)
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    console.error("Refusing to run: key is not a test-mode key (sk_test_ / rk_test_).")
    console.error("This script creates and deletes data. Never point it at live.")
    process.exit(1)
  }
  return key
}

async function readLedger(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(LEDGER, "utf8")) as string[]
  } catch {
    return []
  }
}

async function writeLedger(customerIds: string[]): Promise<void> {
  await writeFile(LEDGER, JSON.stringify(customerIds, null, 2))
}

async function createCustomerWithCard(key: string, label: string): Promise<string> {
  const customer = (await stripe(key, "POST", "/customers", {
    name: label,
    email: `${crypto.randomUUID()}@meowrr-seed.test`,
    metadata: { [SEED_TAG]: "1" },
  })) as { id: string }

  // pm_card_visa is a magic test token; attaching it returns a real pm_ id.
  const method = (await stripe(key, "POST", "/payment_methods/pm_card_visa/attach", {
    customer: customer.id,
  })) as { id: string }

  await stripe(key, "POST", `/customers/${customer.id}`, {
    invoice_settings: { default_payment_method: method.id },
  })

  return customer.id
}

async function createSubscription(
  key: string,
  customerId: string,
  priceId: string,
  quantity: number
) {
  await stripe(key, "POST", "/subscriptions", {
    customer: customerId,
    items: [{ price: priceId, quantity }],
    // Fail loudly rather than leaving an `incomplete` sub, which the app skips
    // and which would look like a polling bug rather than a seeding bug.
    payment_behavior: "error_if_incomplete",
    metadata: { [SEED_TAG]: "1" },
  })
}

async function createPrice(key: string, plan: SeedPlan): Promise<string> {
  const product = (await stripe(key, "POST", "/products", {
    name: `MeowRR seed — ${plan.nickname}`,
    metadata: { [SEED_TAG]: "1" },
  })) as { id: string }

  const price = (await stripe(key, "POST", "/prices", {
    product: product.id,
    currency: "usd",
    unit_amount: plan.unitAmount,
    billing_scheme: "per_unit",
    recurring: {
      interval: plan.interval,
      interval_count: plan.intervalCount,
      usage_type: "licensed",
    },
    metadata: { [SEED_TAG]: "1" },
  })) as { id: string }

  return price.id
}

/** Independently totals MRR across the whole account, the way the app should see it. */
async function verify(key: string): Promise<void> {
  let startingAfter: string | undefined
  let minorUnits = 0
  let counted = 0
  let skipped = 0
  const currencies = new Set<string>()
  const warnings: string[] = []

  for (;;) {
    const page = (await stripe(key, "GET", "/subscriptions", {
      limit: 100,
      status: "all",
      "expand[]": "data.items.data.price",
      starting_after: startingAfter,
    })) as {
      data: {
        id: string
        status: string
        discounts?: unknown[]
        items: {
          data: {
            quantity: number | null
            discounts?: unknown[]
            price: {
              currency: string
              unit_amount: number | null
              billing_scheme: string
              recurring: { interval: string; interval_count: number; usage_type: string } | null
            }
          }[]
        }
      }[]
      has_more: boolean
    }

    for (const subscription of page.data) {
      if (subscription.status !== "active" && subscription.status !== "past_due") {
        skipped += 1
        continue
      }
      if (subscription.discounts?.length) {
        warnings.push(`${subscription.id}: has a discount → app returns unsupported_data`)
        continue
      }
      for (const item of subscription.items.data) {
        const price = item.price
        if (price.recurring?.usage_type === "metered" || price.unit_amount === 0) continue
        if (price.billing_scheme !== "per_unit") {
          warnings.push(`${subscription.id}: tiered price → app returns unsupported_data`)
          continue
        }
        if (!price.recurring) continue
        currencies.add(price.currency)
        minorUnits += monthlyMinorUnits({
          nickname: subscription.id,
          interval: price.recurring.interval as SeedPlan["interval"],
          intervalCount: price.recurring.interval_count,
          unitAmount: price.unit_amount ?? 0,
          quantity: item.quantity ?? 1,
        })
        counted += 1
      }
    }

    if (!page.has_more) break
    startingAfter = page.data[page.data.length - 1]?.id
    if (!startingAfter) break
  }

  const mrr = Number.parseFloat((minorUnits / 100).toFixed(2))
  console.log("\n─────────────────────────────────────────")
  console.log(`Counted ${counted} billable item(s), skipped ${skipped} inactive subscription(s).`)
  if (currencies.size > 1 || (currencies.size === 1 && !currencies.has("usd"))) {
    console.log(`\n⚠️  Currencies present: ${[...currencies].join(", ")}`)
    console.log("   The app hard-fails the entire fetch on non-USD — it will show an error,")
    console.log("   not a partial number. Remove the non-USD subs before smoke testing.")
  }
  for (const warning of warnings) console.log(`⚠️  ${warning}`)
  console.log(`\nMeowRR should display:  MRR $${mrr.toLocaleString("en-US")}`)
  console.log(`                        ARR $${(mrr * 12).toLocaleString("en-US")}`)
  console.log("─────────────────────────────────────────\n")
}

async function cleanup(key: string): Promise<void> {
  const customerIds = await readLedger()
  if (customerIds.length === 0) {
    console.log("Nothing recorded in .stripe-seed.json — nothing to clean up.")
    return
  }
  console.log(`Deleting ${customerIds.length} seeded customer(s)…`)
  let deleted = 0
  for (const id of customerIds) {
    try {
      await stripe(key, "DELETE", `/customers/${id}`)
      deleted += 1
    } catch (error) {
      console.warn(`  skipped ${id}: ${(error as Error).message}`)
    }
  }
  await writeLedger([])
  console.log(`Deleted ${deleted} customer(s); their subscriptions went with them.`)
  console.log("Seeded products/prices remain (Stripe cannot delete used prices) but are inert.")
}

async function seed(key: string, extraCount: number): Promise<void> {
  console.log("Creating prices…")
  const priced: { plan: SeedPlan; priceId: string }[] = []
  for (const plan of PLANS) {
    priced.push({ plan, priceId: await createPrice(key, plan) })
    console.log(`  ${plan.nickname}`)
  }

  const customerIds = await readLedger()
  console.log("\nCreating customers + subscriptions…")
  let expected = 0

  for (const { plan, priceId } of priced) {
    const customerId = await createCustomerWithCard(key, `Seed — ${plan.nickname}`)
    await createSubscription(key, customerId, priceId, plan.quantity)
    customerIds.push(customerId)
    expected += monthlyMinorUnits(plan)
    console.log(`  ${plan.nickname} → active`)
    await writeLedger(customerIds)
  }

  if (extraCount > 0) {
    const filler = priced[0]
    console.log(`\nCreating ${extraCount} extra subscriptions to exercise pagination…`)
    for (let index = 0; index < extraCount; index += 1) {
      const customerId = await createCustomerWithCard(key, `Seed filler ${index + 1}`)
      await createSubscription(key, customerId, filler.priceId, filler.plan.quantity)
      customerIds.push(customerId)
      expected += monthlyMinorUnits(filler.plan)
      if ((index + 1) % 10 === 0) {
        await writeLedger(customerIds)
        console.log(`  ${index + 1}/${extraCount}`)
      }
    }
    await writeLedger(customerIds)
  }

  console.log(`\nSeeded MRR contribution: $${(expected / 100).toFixed(2)}`)
  console.log("Now totalling the whole account (other existing subs count too)…")
  await verify(key)
}

const args = new Set(process.argv.slice(2))
const countFlag = process.argv.indexOf("--count")
const extraCount = countFlag === -1 ? 0 : Number.parseInt(process.argv[countFlag + 1] ?? "0", 10)
const key = requireTestKey()

console.log(`Using key ${key.slice(0, 12)}… (test mode)\n`)

try {
  if (args.has("--cleanup")) await cleanup(key)
  else if (args.has("--verify")) await verify(key)
  else await seed(key, Number.isFinite(extraCount) ? extraCount : 0)
} catch (error) {
  // A stack trace here is noise: every realistic failure is a bad key or a
  // rejected parameter, and both are actionable from the message alone.
  if (error instanceof StripeError) {
    console.error(`\nStripe rejected a request:\n  ${error.message}`)
    if (error.message.includes("401")) {
      console.error("\nCheck STRIPE_SECRET_KEY is a current test key from")
      console.error("https://dashboard.stripe.com/test/apikeys")
    }
    console.error("\nAnything already created is recorded in .stripe-seed.json;")
    console.error("run with --cleanup to remove it.")
    process.exit(1)
  }
  throw error
}
