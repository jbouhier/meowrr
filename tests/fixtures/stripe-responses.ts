export const steadySubscriptions = {
  data: [
    {
      id: "sub_monthly",
      status: "active",
      items: {
        data: [
          {
            quantity: 2,
            price: {
              billing_scheme: "per_unit",
              currency: "usd",
              recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
              unit_amount: 10_000,
              unit_amount_decimal: "10000",
            },
          },
        ],
      },
    },
    {
      id: "sub_yearly",
      status: "past_due",
      items: {
        data: [
          {
            quantity: 1,
            price: {
              billing_scheme: "per_unit",
              currency: "usd",
              recurring: { interval: "year", interval_count: 1, usage_type: "licensed" },
              unit_amount: 120_000,
              unit_amount_decimal: "120000",
            },
          },
        ],
      },
    },
  ],
  has_more: false,
}

export const ignoredSubscriptions = {
  data: [
    {
      id: "sub_trial",
      status: "trialing",
      items: { data: steadySubscriptions.data[0].items.data },
    },
    {
      id: "sub_unpaid",
      status: "unpaid",
      items: { data: steadySubscriptions.data[0].items.data },
    },
    {
      id: "sub_metered",
      status: "active",
      items: {
        data: [
          {
            quantity: 1,
            price: {
              billing_scheme: "per_unit",
              currency: "usd",
              recurring: { interval: "month", interval_count: 1, usage_type: "metered" },
              unit_amount: 10_000,
            },
          },
        ],
      },
    },
  ],
  has_more: false,
}
