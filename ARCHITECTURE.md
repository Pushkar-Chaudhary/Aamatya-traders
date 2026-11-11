# Architecture

## Initial direction

Amatya Traders is a B2B wholesale distribution system for the company's public site, staff operations, and retailer ordering. These surfaces share one API and database; they are not independent applications with separate business data.

Use a **modular monolith**: a single TypeScript API process divided into business modules, with explicit service boundaries and one MongoDB database. This keeps deployments and transaction boundaries straightforward while the business workflows are established. Modules should not hide business rules in React components or HTTP controllers.

## Repository layout

```text
apps/
  api/       Express REST API, Mongoose persistence, and business modules
  web/       React/Vite application for public, staff, and retailer experiences
```

The API owns validation, authorization, business rules, and persistence. The web app calls the API and must not be trusted for prices, permissions, inventory, or accounting totals. Vite proxies `/api` to the API during local development.

## Backend module boundaries

The planned modules are authentication; users and roles; products and categories; warehouses, inventory, stock movements and reservations; retailers and suppliers; orders; purchases and goods receipts; invoices and payments; accounting and expenses; deliveries and returns; reports; audit logs; and notifications.

Each module should own its schemas, input validation, service logic, controllers, routes, and public types as appropriate. Controllers stay thin. Cross-module workflows should call services and use MongoDB transactions where stock and financial records must change atomically.

## Data and business invariants

- Store money as integer paisa, never floating-point currency.
- Use Nepalese rupees (NPR/NRs) as the business currency; store values as integer paisa and format currency at the UI boundary.
- Keep order and invoice line-item snapshots so later catalog changes do not rewrite history.
- Treat stock and financial balances as the result of traceable movements/entries, not arbitrary editable totals.
- Use indexes, timestamps, unique constraints, pagination, and audit trails for operational records.
- Protect concurrent stock operations and prevent negative stock by default.
- Require every posted accounting journal entry to balance (debits equal credits); correct posted records with reversals.
- Enforce role permissions and retailer data isolation on the server.

## Runtime and integrations

- `apps/web`: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, and Lucide.
- `apps/api`: Node.js, Express, TypeScript, Mongoose, and Zod.
- MongoDB Atlas (or local MongoDB in development) is the shared persistence layer.
- Cloudinary, PDF generation, and PWA support are planned integrations; credentials belong only in server-side environment variables.
- Authentication uses phone OTP via Sparrow SMS, hashed/revocable sessions in secure HTTP-only cookies, and server-enforced role authorization. The initial `OWNER_PHONE` must complete SMS verification; OTP bypasses are not supported. Production startup requires MongoDB, Sparrow credentials, an OTP secret, an owner phone, and an HTTPS web origin.

The API exposes `/api/health`, including MongoDB connection state. A missing database URI is visible as degraded health; a configured but unreachable database is a startup failure. No database or external integration is represented as connected when it is not.

## Security and operations

Authentication uses short-lived OTP challenges, secure HTTP-only cookies, CSRF protection, request validation, authorization middleware, request-size limits, safe errors, session revocation, and audit logging. Secrets must never be exposed in web build variables or committed; `.env` is ignored by Git.

Financial and inventory operations require idempotency and transaction/concurrency controls. Backup and restore procedures must be defined before production use.
