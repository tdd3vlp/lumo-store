# Lumo Signal

Gift-card and top-up storefront (Steam, PlayStation, App Store, …), with codes
sourced wholesale from NS.gifts.

## Local setup

```bash
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Accounts, gift-card pricing, and fulfillment are documented in
[docs/data-platform.md](docs/data-platform.md). The admin catalog
(`/admin/ns-gifts`) browses the NS.gifts wholesale catalog, publishes curated
products, and buys codes into inventory.
