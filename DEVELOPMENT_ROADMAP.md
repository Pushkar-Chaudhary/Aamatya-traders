# Development Roadmap

Build and verify one milestone at a time. The first milestone is complete only after its documented checks pass. Stop for owner approval before beginning authentication.

## Milestone 1 — Foundation (complete)

- Establish the repository, TypeScript workspaces, development scripts, and architecture/roadmap documentation.
- Validate server environment variables and wire MongoDB connection handling.
- Add an API health endpoint and a minimal web app that displays its real status.
- Verify installs, builds, typechecks, and both local development servers.

## Milestone 2 — Authentication and authorization (implemented; SMS setup required)

- Define user and role models and secure one-time owner setup.
- Add Sparrow phone OTP, secure cookie sessions, CSRF defenses, session revocation, rate limits, and authorization middleware.
- Test role permissions and retailer data isolation before exposing protected workflows.

## Milestone 3 — Staff workspace and product catalog (initial slice implemented)

- Provide a signed-in staff workspace with live overview counts, role-aware navigation, team management, and product catalog management.
- Product records include SKU, brand/category, selling unit, and paisa-based prices; they do not imply on-hand stock.
- Next: warehouse, inventory movements, purchasing/receiving, and low-stock workflows.

## Milestone 4 — Warehouse and inventory

- Add categories, products, units, warehouses, inventory, stock movements, reservations, and audit records.
- Implement base-unit conversions, receiving, adjustments, transfers, low-stock alerts, and concurrency-safe stock rules.
- Test inventory invariants and historical product snapshots.

## Milestone 5 — Retailers and order workflow

- Add retailer onboarding, approval, credit settings, and account history.
- Prioritize fast staff-entered phone orders, then retailer ordering.
- Add order lifecycle, stock reservation, cancellation, partial fulfillment, and idempotency.

## Milestone 6 — Purchasing and deliveries

- Add suppliers, purchase orders, partial goods receipts, and supplier obligations.
- Add picking, packing, dispatch, delivery assignment, confirmation, exceptions, and returned goods.

## Milestone 7 — Invoicing, payments, and accounting

- Add invoice snapshots, payment allocation, credit enforcement, expenses, chart of accounts, and double-entry journals.
- Use integer paisa, transactional posting, immutable posted records, and reversal workflows.
- Test financial calculations, allocations, and balanced journal invariants.

## Milestone 8 — Reporting, public site, and production readiness

- Add operational and financial reports, public company pages, notifications, PDF output, and Cloudinary-backed images.
- Add PWA support, backups/restore procedures, monitoring, accessibility checks, and end-to-end operational testing.
- Review deployment, security controls, and recovery procedures before production rollout.
