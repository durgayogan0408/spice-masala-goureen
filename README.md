# Spice & Masala Homemade

A full-stack storefront and operations portal for homemade Indian spices, masalas, sweets, and gift packs.

## Architecture

```text
client/                 React + TypeScript + Vite storefront and /admin portal
  src/
    components/         Shared navigation, cards, and layout
    pages/              Shop, product, cart, checkout, account, admin
    lib/                Typed API client and cart helpers
server/                 Express REST API
  src/
    middleware/         JWT authorization and centralized errors
    models/             Mongoose users, products, categories, and orders
    routes/             Auth, catalogue, checkout, and admin endpoints
    services/           Order pricing and inventory workflow
database/               MongoDB indexes and development seed data
```

The API is the source of truth for prices and stock. Checkout snapshots product names, variants, and prices into orders; stock deductions and order creation use a MongoDB transaction so stock cannot be oversold. Use a MongoDB replica set (including a single-node local replica set) to support transactions. Admin APIs require a signed JWT and the `admin` role.

## Data model

- **User**: name, unique normalized email, phone, password hash, role, saved addresses, timestamps.
- **Category**: unique slug, name, description, image, sort order, active flag.
- **Product**: unique slug, category reference, description, ingredients/allergens, shelf life/storage, images, active/featured flags, variant array, timestamps. Variants contain SKU, pack size, price, optional sale price, stock and low-stock threshold.
- **Order**: unique order number, user reference, immutable customer/address/item snapshots, item subtotal, delivery fee, total, payment method/status, order status, optional manual shipment, status history, timestamps.

MongoDB creates indexes for unique email/slug/order number and common catalogue/order queries. Order item snapshots are intentionally independent of later catalogue edits.

## API

All responses are JSON. Protected routes use `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Sign in and return a JWT |
| GET | `/api/auth/me` | Customer | Current account |
| GET | `/api/categories` | Public | Active categories |
| GET | `/api/products` | Public | Search/filter/paginated active products |
| GET | `/api/products/:slug` | Public | Product details |
| POST | `/api/orders` | Customer | Validate cart, reserve stock, and place an idempotent COD order (`Idempotency-Key` UUID header required) |
| GET | `/api/orders/mine` | Customer | Customer order history |
| POST | `/api/orders/:id/cancel` | Order owner | Cancel an eligible order and restore inventory |
| GET | `/api/orders/:id` | Owner/Admin | Order detail and tracking |
| GET | `/api/admin/dashboard` | Admin | Order, revenue, and low-stock metrics |
| GET/POST | `/api/admin/products` | Admin | List/create products |
| PATCH/DELETE | `/api/admin/products/:id` | Admin | Update/deactivate product |
| GET/POST | `/api/admin/categories` | Admin | List/create categories |
| PATCH/DELETE | `/api/admin/categories/:id` | Admin | Update/deactivate categories |
| GET | `/api/admin/orders` | Admin | Filtered order list |
| PATCH | `/api/admin/orders/:id/status` | Admin | Advance order lifecycle |
| PATCH | `/api/admin/orders/:id/shipment` | Admin | Enter confirmed manual courier details |

Health check: `GET /api/health`. See `.env.example` for configuration. Razorpay and Shiprocket credentials are optional integration points; COD and clearly labelled manual shipping work without third-party credentials. This build does not claim online payments or carrier bookings are active when credentials/provider confirmation are absent.

## Local development

Requirements: Node.js 20+, npm, and MongoDB running as a replica set.

1. Copy `server/.env.example` to `server/.env` and set a long random `JWT_SECRET` and an admin password. (The root `.env.example` is provided for deployment tooling.)
2. Configure MongoDB as a replica set and use the matching replica-set name in `MONGODB_URI` (the example URI expects `rs0`).
3. Install dependencies: `npm install`.
4. Seed development data and the admin account: `npm run seed`.
5. Start both apps: `npm run dev`.
6. Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

Run the dependency-free workflow tests with `npm test`; create a production build with `npm run build`.

The seed script creates sample products, categories, and the configured admin account. It does not create a public demo customer or ship credentials.

## Vercel Deployment & Testing with Custom URLs

The storefront is configured for Vercel deployment with single-page app (SPA) routing in [vercel.json](/home/dell/Documents/GitHub/goureen-project/vercel.json).

### 1. Custom URL Configuration for Testing
To connect the deployed frontend to any local or hosted backend during testing:
- **In-App Testing Modal**: Click the **API: /api** pill in the website footer. Enter your custom backend URL (e.g. `https://my-backend.railway.app` or `http://localhost:4000`), test connectivity via the built-in health check button, and apply.
- **URL Query Parameter**: Append `?apiUrl=https://your-backend-url.com` to any deployed URL. The app will automatically save and use this backend address.
- **Environment Variable**: Set `VITE_API_URL=https://your-backend-url.com` in your Vercel project environment variables.

### 2. Deploying to Vercel
- **Using Vercel CLI**:
  ```bash
  npx vercel
  # or with token:
  npx vercel --token <VERCEL_TOKEN> --prod
  ```
- **Custom URL / Domain on Vercel**:
  Assign a custom alias or project domain:
  ```bash
  npx vercel alias set <deployment-url> <custom-name>.vercel.app
  ```

## Security and operational notes

- Passwords are bcrypt-hashed; JWTs are required for account/admin APIs.
- Request bodies are schema-validated, admin routes are role-guarded, and API requests are rate-limited.
- Prices, discounts, delivery fees, and available stock are recalculated on the server.
- Never store payment card data. Set up Razorpay order creation, signature verification, and webhooks before enabling online payment.
- Manual shipment data must be entered by an admin; an order cannot be marked shipped until courier and tracking details are entered.
- Configure TLS, backups, production secrets, email delivery, monitoring, and a vetted payment/shipping provider before launch.
