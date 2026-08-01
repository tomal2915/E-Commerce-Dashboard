# E-Commerce Admin Dashboard & REST API

A production-style E-Commerce Admin Dashboard and REST API built with **NestJS**, **PostgreSQL**, **Prisma ORM**, and **Next.js**. The platform implements dynamic Role-Based Access Control (RBAC), nested categories, a shared media library, product & variant management, and full JWT authentication with refresh-token rotation.

**Live Demo:** https://e-commerce-dashboard-eight-xi.vercel.app
**Live API:** https://e-commerce-backend-lou1.onrender.com
**API Documentation (Swagger):** https://e-commerce-backend-lou1.onrender.com/api-docs

---

## 🚀 Tech Stack

| Area | Technology |
|---|---|
| Backend Framework | NestJS (Node.js v20 LTS) |
| Database | PostgreSQL (hosted on Neon) |
| ORM & Migrations | Prisma ORM |
| Authentication | JWT — short-lived access token + long-lived refresh token, rotated on every refresh |
| Password Hashing | bcrypt |
| Validation | class-validator + class-transformer |
| Media Processing | Multer (upload) + Sharp (thumbnails) + `file-type` (real content verification) |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Frontend Framework | Next.js (App Router) + React + TailwindCSS + shadcn/ui |
| Deployment | Backend on Render, Frontend on Vercel |

---

## 🛠️ Installation & Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd e-commerce-admin

# Backend
cd admin-api
npm install

# Frontend (in a separate terminal/tab)
cd ../admin-frontend
npm install
```

### 2. Environment configuration

**Backend — create `admin-api/.env`:**

```dotenv
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require&channel_binding=require"

JWT_ACCESS_SECRET="a-long-random-string"
JWT_REFRESH_SECRET="a-different-long-random-string"

CORS_ALLOWED_ORIGINS="http://localhost:3001,https://your-frontend.vercel.app"
```

A template is provided at `admin-api/.env.example` — copy it and fill in real values. Never commit `.env` itself.

**Frontend — create `admin-frontend/.env.local`:**

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Database migration & seeding

```bash
cd admin-api

# Applies all committed migrations, creating every table, FK, and unique index
npx prisma migrate deploy
# (first-time / fresh local database: npx prisma migrate dev --name init)

npx prisma generate

# Seeds every permission, both roles, and both test users
npx prisma db seed
```

### 4. Run the project

```bash
# Terminal 1 — Backend
cd admin-api
npm run start:dev
# → http://localhost:3000

# Terminal 2 — Frontend
cd admin-frontend
npm run dev
# → http://localhost:3001
```

There is **no** global API prefix (`/api/v1`) — routes are mounted directly at the root, e.g. `POST http://localhost:3000/auth/login`.

---

## 🔑 Seeded Accounts

The seed script (`prisma/seed.ts`) creates every permission in Section 4.3 of the spec, two roles, and two users, so access control can be verified immediately on an empty database.

| Account | Email | Password | Access |
|---|---|---|---|
| Super Administrator | `admin@dashboard.com` | `AdminPassword123!` | Every permission in the system |
| Catalog Manager | `catalog@dashboard.com` | `CatalogPassword123!` | `dashboard`, `product`, `category`, `brand`, `attribute`, `media` only — **no** access to Permission, Role, or User modules |

**To verify 403 behavior in seconds:** log in as `catalog@dashboard.com` and call any Permission/Role/User endpoint (e.g. `GET /users`, `DELETE /roles/:id`) — it returns `403 Forbidden`.

---

## 🔒 Authentication Strategy

- **HttpOnly cookies**, not `Authorization: Bearer` headers. `POST /auth/login` sets `access_token` (15 min) and `refresh_token` (7 days) as `httpOnly`, `sameSite: strict` cookies, and also returns the access token in the JSON response body for direct API testing (e.g. via Swagger or Postman, since cookies won't attach automatically from those tools by default).
- **Refresh token rotation:** `POST /auth/refresh` verifies the current refresh token, deletes it, and issues a brand-new access + refresh pair. The old refresh token cannot be reused afterward.
- **Real logout:** `POST /auth/logout` deletes the matching refresh token row from the database — it does not merely clear the browser cookie.
- **Refresh tokens are stored hashed** (bcrypt) in the database, never in plaintext, so a database leak alone cannot be used to forge sessions.
- **Inactive users** are blocked at both `login` and `refresh` — even a still-valid, unexpired token is rejected once `isActive` is `false`.
- **CORS + CSRF:** Since cookies are used, CORS is restricted to an explicit origin allow-list (`CORS_ALLOWED_ORIGINS`) with `credentials: true`. On top of `sameSite: strict` (which already blocks the cookie from being sent on cross-site requests), a double-submit CSRF token (`csrf_token` cookie + `x-csrf-token` header, verified in `CsrfMiddleware`) protects every state-changing request except `/auth/login` and `/auth/refresh`.

---

## 🧭 Role Change / Deactivation Timing

Per the spec's requirement to state this explicitly: **a role or active-status change takes effect on the user's very next request**, not on their next login or token refresh. `PermissionGuard` re-fetches the user's current role and permission set from the database on every single request rather than trusting anything cached in the JWT payload — so revoking a permission or deactivating a user is enforced immediately, mid-session.

---

## 🗑️ Delete Semantics

- **User deletion is a hard delete.** The row is permanently removed via `prisma.user.delete()`. Associated `RefreshToken` rows cascade automatically.
- **Media deletion detaches cleanly** rather than refusing. If an asset is still attached to a product, variant, or attribute value, those `ProductMedia` links (and `AttributeValue.referenceMediaId` references) are removed first, then the file and its thumbnail are deleted from disk, then the database record. Other products referencing the same asset are unaffected.
- **Category deletion is refused** if the category still has subcategories or products attached — the admin must reassign or remove those first.
- **Permission deletion cascades** — deleting a permission removes it from every role that held it (`RolePermission` has `onDelete: Cascade`), rather than blocking the delete.
- **Product deletion** cascades its variants and media *attachment* rows, but the underlying `Media` assets themselves are left untouched, since other products may still reference them.

---

## 📁 Module Status

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Authentication | ✅ Complete | Login, refresh rotation, real logout, generic invalid-credential error, inactive-user blocking |
| 2 | Permission | ✅ Complete | Grouped creation, custom actions, cascade-on-delete, server-side pagination + search |
| 3 | Role | ✅ Complete | Grant-all, last-`role:update`-holder guard, delete-blocked-while-assigned, pagination + search, user count |
| 4 | User | ✅ Complete | Self-escalation prevention, role/status filters, search, pagination, hard delete |
| 5 | Media | ✅ Complete | Single + multi-file upload, real magic-number MIME verification (not just client-supplied type), thumbnail generation, detach-on-delete, pagination + type filter |
| 6 | Category | ✅ Complete | Unlimited nesting, tree endpoint, DB-enforced unique slug, cycle rejection, delete-refuse |
| 7 | Brand | ✅ Complete | Search, pagination, status filter, delete-blocked-while-referenced |
| 8 | Attribute | ✅ Complete | Five types incl. colour/image swatch, per-attribute-unique values, delete-guard against variant usage |
| 9 | Product | ✅ Complete | Simple/variable distinction, transaction-wrapped create *and* update, duplicate-SKU/slug/combination rejection, single-thumbnail enforcement, category/media/variant full-replace on update |

All nine modules are complete end-to-end: guarded routes, validated DTOs, and a corresponding frontend screen.

---

## ⚠️ Known Issues / Limitations

- **CSRF protection** uses a custom double-submit token implementation rather than a widely-audited library (since `csurf` is deprecated). It's layered on top of `sameSite: strict` cookies and a strict CORS origin allow-list, which already close most of the traditional CSRF attack surface — but it hasn't been independently security-reviewed.
- **Rate limiting** on `/auth/login` is not implemented — a brute-force attempt against a known email is not currently throttled.
- **Refresh-token reuse detection** (invalidating an entire token family if a rotated-out token is replayed) is not implemented — only straightforward rotation.
- **No automated tests** — validated manually via Swagger and the frontend.
- **Attribute list has no pagination** — datasets here are expected to stay small (a handful of attributes, each with a nested value list), so a flat list was kept rather than forcing table-style pagination onto a non-tabular UI.

---

## 🧪 Quick Postman/Swagger Verification Flow

1. **Login as Super Admin** — `POST /auth/login` with `admin@dashboard.com` / `AdminPassword123!`. Copy the `accessToken` from the response body.
2. **Access a protected route** — `GET /users` with header `Authorization: Bearer <token>` → `200 OK`.
3. **Test 403** — log in as `catalog@dashboard.com` instead, then `POST /roles` or `DELETE /users/:id` → `403 Forbidden`.
4. **Test 401** — call any protected route with no token, or an expired/malformed one → `401 Unauthorized`.
5. **Test refresh rotation** — `POST /auth/refresh`, then try reusing the *old* refresh token cookie again → rejected.
6. **Test validation** — `POST /products` with a `salePrice` greater than `price`, or a negative `stock` → `400 Bad Request`.
7. **Test conflict handling** — create two categories with the same name/slug → the second returns `409 Conflict`.

Full interactive documentation for every route is available at `/api-docs` (Swagger UI) on both the local and deployed backend.

---

## 📂 Project Structure

admin-api/ NestJS backend
prisma/
schema.prisma Full data model
seed.ts Permission/role/user seeding
migrations/ Committed, runnable migrations
src/
common/ Guards, decorators, filters, interceptors, CSRF middleware
modules/ One folder per domain module (auth, permission, role, user,
media, category, brand, attribute, product) — each with its
own controller, service, and DTOs

admin-frontend/ Next.js (App Router) dashboard
src/
app/(dashboard)/ Protected routes, one folder per screen
app/login/ Public login screen
components/ Shared UI, permission matrix, media picker
context/ AuthContext (session restore, token refresh)
lib/ Axios instance with refresh-and-retry interceptor


---

## 🔁 Git History

This repository was built incrementally over the course of development — see commit history for the module-by-module build order (Permission → Role → User → Media → Category → Brand → Attribute → Product), matching the dependency order specified in the assignment.