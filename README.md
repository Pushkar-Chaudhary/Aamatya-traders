# Amatya Traders (अमात्य ट्रेडर्स)

A production-ready B2B wholesale distribution and financial management platform for Amatya Traders in Lahan, Siraha, Nepal.

---

## System Architecture & Features

The platform is designed as a high-performance **modular monolith** with:
- **`apps/api`**: Express 5 REST API, Mongoose models, cryptographic session authentication, financial ledger, order lifecycle management, and wholesale product catalog.
- **`apps/web`**: React 19 + Vite single-page application with bilingual support (English & नेपाली), role-aware workspaces, and dedicated Retailer/Buyer Portal.

---

## Authentication & Role-Based Access

Authentication uses secure HTTP-only cookies, anti-CSRF tokens, and PBKDF2/scrypt hashed passwords. 

### Staff vs. Buyer Authentication Rules
1. **Staff (Owner, Sales Manager, Accountant, Admin)**:
   - Authenticate with **Email & Password**.
   - **Do NOT require a mobile phone number**.
2. **Wholesale Retailers & Buyers**:
   - Authenticate with **Nepal Mobile Number (or Email) & Password**.
   - **Mobile phone number IS mandatory** for buyer registration, order verification, and dispatch tracking.

---

## Development Demo Accounts

The local development environment seeds demo accounts and sample data from `.env`; the login shortcuts are only shown in development. Never use the published development demo credentials in production. Production startup requires explicitly configured, unique secrets and an owner password of at least 16 characters, creates only the initial owner when needed, and does not reset existing owner credentials or seed demo/sample data.

---

## Financial Management Module

Financial management is accessible to **Owner** and **Accountant** (with sales-related invoice visibility for Sales Manager).

### Key Features:
- **Real-Time KPI Cards**:
  - **Total Revenue (जम्मा आम्दानी)**: Real-time sum of collected payments.
  - **Accounts Receivable (उठ्न बाँकी बक्यौता)**: Outstanding unpaid invoices owed by retail buyers.
  - **Total Expenses (जम्मा खर्च)**: Operational expenditures (Warehouse Rent, Staff Salaries, Transport Fuel, NEA Electricity, Supplies).
  - **Net Cash Flow / Profit (खुद बचत / मुनाफा)**: Calculated as $\text{Total Revenue} - \text{Total Expenses}$.
- **Invoices & Dues**:
  - Filter by status: `PAID`, `PARTIAL`, `PENDING`, `OVERDUE`.
  - Record payments against invoices with payment methods: `Cash`, `Bank Transfer`, `eSewa`, `Khalti`, `Cheque`.
- **Operating Expenses**:
  - Categorized records (`RENT`, `SALARIES`, `TRANSPORT`, `UTILITIES`, `SUPPLIES`, `MAINTENANCE`, `OTHER`).
  - Modal to record new operational expenses.
- **Cash Flow / Transactions Ledger**:
  - Combined chronological stream of incoming receipts $(+)$ and outgoing expenses $(-)$.
- **Integer Paisa Invariant**:
  - All monetary values are strictly stored as integer paisa (1 NPR = 100 paisa) to prevent floating-point rounding errors.

---

## Retailer / Buyer Portal

When a user with the `RETAILER` role signs in, they are directed to the **Buyer Portal**:
- **Wholesale Catalog**: Search and browse FMCG & grocery goods with wholesale pricing in Nepalese Rupees (NRs).
- **Interactive Cart & Order Placement**: Add items with quantity steppers, specify delivery shop address and instructions, and submit wholesale orders.
- **My Orders**: Real-time status tracking (`PENDING` $\to$ `CONFIRMED` $\to$ `DISPATCHED` $\to$ `DELIVERED`).
- **Invoices & Dues**: Outstanding balance banner and invoice history.
- **Store Profile**: Retail business name, proprietor name, and verified mobile number.

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend API (Port 4000)
   npm run dev:api

   # Terminal 2: Frontend Web (Port 5173)
   npm run dev:web
   ```

3. Open <http://localhost:5173>. The API health check is available at <http://localhost:4000/api/health>.

---

## Production Build & Verification

```bash
# Verify TypeScript across all workspaces
npm run typecheck

# Build optimized production bundles for API & Web
npm run build

# Run unit tests
npm test
```

## Security & Availability Notes

- The API applies Helmet headers, strict CORS/origin checks, CSRF protection, a 1 MB JSON body limit, a general 300-request/15-minute IP limit, and a stricter 20-request/15-minute auth limit.
- The built-in rate-limit store is per process. For multi-instance deployments, put a WAF/reverse proxy in front of the app and use a shared rate-limit store or edge-level limits; do not expose the app server directly to untrusted traffic.
- Use HTTPS, unique secrets, least-privilege database credentials, backups, and monitoring. Rate limits reduce abuse but cannot guarantee immunity from distributed denial-of-service attacks.

---

## Deployment Options

### 1. Single Container / Docker Deployment
A multi-stage `Dockerfile` is included. It builds both the frontend and backend, serving the static frontend directly from Express in production:
```bash
docker build -t amatya-traders .
docker run -p 4000:4000 --env-file .env amatya-traders
```

### 2. Cloud Platforms (Render, Railway, Fly.io, DigitalOcean)
- **Root Directory**: `.`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=4000`
  - `MONGODB_URI=<your-mongodb-atlas-connection-string>`
  - `WEB_ORIGIN=<your-production-url>`
  - `AUTH_SECRET=<unique-random-secret-at-least-32-characters>`
  - `OTP_HMAC_SECRET=<different-unique-secret-at-least-32-characters>`
  - `OWNER_EMAIL=<initial-owner-email>`
  - `OWNER_PASSWORD=<unique-password-at-least-16-characters>`
