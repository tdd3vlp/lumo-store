# Gift card pricing

The regional face value and the customer-facing sale price are different
concepts:

- `gift_card_denominations` stores the fixed face value (nominal) of a code in
  its regional currency, plus its `product_type` (steam, playstation, …).
- `gift_card_procurement_prices.purchase_cost_minor` stores our purchase cost
  in RUB kopecks for each denomination.
- `gift_card_region_pricing_policies.markup_basis_points` stores a shared
  regional markup (`1500` means 15%).
- `sale_price_override_minor` can replace the calculated price for one
  denomination.
- `gift_card_retail_prices` is the public read model used by the storefront and
  checkout.

The future admin screen should have two sections:

1. Region policy: markup and rounding step for India and Turkey.
2. Denominations: active state, purchase cost, optional manual sale price and
   available inventory.

Changing a regional markup updates every calculated storefront price
immediately. A manual override only affects its denomination. Purchase costs
and overrides must never be returned by the public catalog API.

All order totals and payments are stored in RUB minor units. Regional face
values remain attached to the denomination as the nominal shown to the
customer.
