# Lumo Signal

PlayStation catalog and gift-card storefront.

## Local setup

```bash
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Catalog ingestion, accounts and gift-card fulfillment are documented
in [docs/data-platform.md](docs/data-platform.md).
