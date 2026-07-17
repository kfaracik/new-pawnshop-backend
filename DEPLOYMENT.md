# Deployment guide — Nowy Lombard (free-tier stack)

Three services, all on free tiers:

| Service              | Repo                     | Host              | URL shape                          |
| -------------------- | ------------------------ | ----------------- | ---------------------------------- |
| Backend API          | `new-pawnshop-backend`   | Render (free web) | `https://<name>.onrender.com`      |
| Storefront (front)   | `new-pawnshop-front`     | Vercel (Hobby)    | `https://<name>.vercel.app`        |
| Admin panel          | `new-pawnshop-admin`     | Vercel (Hobby)    | `https://<name>.vercel.app`        |
| Database             | —                        | MongoDB Atlas M0  | `mongodb+srv://…`                  |

Product images are stored **inline as base64 in MongoDB** (no object storage / no cost). S3/R2 is optional and can be wired later via the `S3_*` vars in the admin.

Payments are intentionally **disabled** (Stripe is a stub). Everything else works end to end.

---

## Order of operations

1. MongoDB Atlas (database) — should already exist.
2. Backend → Render. Get its URL.
3. Front → Vercel. Point it at the backend URL.
4. Admin → Vercel. Point it at the backend URL + configure Google OAuth.
5. Update backend `CORS_ORIGINS` with the two Vercel URLs.

---

## 1. MongoDB Atlas

- Use the existing free M0 cluster (or create one at mongodb.com/atlas).
- Network Access → allow `0.0.0.0/0` (Render/Vercel use dynamic IPs).
- Copy the `mongodb+srv://…` connection string. **Percent-encode special characters in the password** (e.g. `!` → `%21`).

## 2. Backend on Render

Option A — Blueprint (one click): the repo has `render.yaml`.
- Render Dashboard → **New +** → **Blueprint** → pick the `new-pawnshop-backend` repo → Apply.

Option B — manual:
- **New +** → **Web Service** → connect the repo.
- Runtime: Node. Build: `npm install && npm run build`. Start: `npm start`. Plan: **Free**. Health check path: `/health`.

Set env vars (Dashboard → Environment):

| Key                          | Value                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                   | `production`                                                 |
| `MONGODB_URI`                | your Atlas string (password percent-encoded)                |
| `JWT_SECRET`                 | a long random string                                        |
| `AUCTION_ADMIN_TOKEN`        | a strong token (reuse the exact same value in the admin)    |
| `CORS_ORIGINS`               | `https://<front>.vercel.app,https://<admin>.vercel.app`     |
| `CORS_ALLOW_VERCEL_PREVIEWS` | `true` (lets `*.vercel.app` preview deploys call the API)   |
| `ENABLE_API_DOCS`            | `false`                                                     |

Do **not** set `PORT` — Render provides it. Deploy, then confirm `https://<name>.onrender.com/health` returns `{"status":"ok"}`.

> Free-tier note: the service sleeps after ~15 min idle; the first request then takes ~30–50 s to wake. This only affects cold starts.

## 3. Storefront (front) on Vercel

- Vercel → **Add New… → Project** → import `new-pawnshop-front`. Framework auto-detects as Next.js. Keep defaults (build `next build`).
- Environment Variables:

| Key                                | Value                                        |
| ---------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`         | `https://<backend>.onrender.com/api`         |
| `NEXT_PUBLIC_API_VERSION`          | `v1`                                         |
| `NEXT_PUBLIC_SITE_URL`             | `https://<front>.vercel.app`                 |
| `NEXT_PUBLIC_FACEBOOK_AUCTIONS_URL`| your Facebook URL                            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`| `pk_test_…` (optional, payments stubbed)    |

Deploy. Open the site, browse products, add to cart, complete checkout (order is created; payment is stubbed).

## 4. Admin panel on Vercel

- Import `new-pawnshop-admin` as a second Vercel project.
- Environment Variables:

| Key                   | Value                                             |
| --------------------- | ------------------------------------------------- |
| `NODE_ENV`            | `production`                                      |
| `NEXTAUTH_URL`        | `https://<admin>.vercel.app`                      |
| `SECRET`              | a long random string                              |
| `GOOGLE_ID`           | Google OAuth client id                            |
| `GOOGLE_SECRET`       | Google OAuth client secret                        |
| `ADMIN_EMAILS`        | comma-separated allowlist of admin emails         |
| `MONGODB_URI`         | same Atlas string as the backend                  |
| `AUCTION_BACKEND_URL` | `https://<backend>.onrender.com` (no `/api`)      |
| `AUCTION_ADMIN_TOKEN` | **exact same token** as the backend               |

Google OAuth (Google Cloud Console → Credentials → your OAuth client):
- Authorized redirect URI: `https://<admin>.vercel.app/api/auth/callback/google`
- Only emails in `ADMIN_EMAILS` can sign in.

> The local-only "Sign in with Local admin" credentials login is disabled in production (`NODE_ENV=production`).

## 5. Finalize CORS

Once the two Vercel URLs are known, make sure the backend `CORS_ORIGINS` lists them exactly, then redeploy the backend.

---

## Alternative backend hosts (Fly.io / Koyeb / Railway)

The repo ships a portable `Dockerfile` (+ `.dockerignore`) and a `fly.toml`, so the backend can run on any container host instead of Render. Set the same secrets everywhere: `MONGODB_URI`, `JWT_SECRET`, `AUCTION_ADMIN_TOKEN`, `CORS_ORIGINS`, `CORS_ALLOW_VERCEL_PREVIEWS=true`.

### Fly.io (free allowance)

```bash
fly launch --no-deploy         # reuses the bundled fly.toml (region waw, port 8888)
fly secrets set \
  MONGODB_URI="mongodb+srv://…" \
  JWT_SECRET="…" \
  AUCTION_ADMIN_TOKEN="…" \
  CORS_ORIGINS="https://<front>.vercel.app,https://<admin>.vercel.app"
fly deploy
```

`auto_stop_machines` scales the machine to zero when idle (like Render's sleep) to stay within the free allowance. Health check is `/health`.

### Koyeb (free web service)

- Create a Web Service from the GitHub repo. Koyeb auto-detects the `Dockerfile`.
- Port: `8888`. Health check: `/health`.
- Add the same env vars/secrets as above.

### Railway

- New Project → Deploy from GitHub. Railway detects the `Dockerfile`.
- Set the env vars/secrets. Railway injects `PORT`; the app already respects it.

> All of these expose an `https://…` URL you then plug into the front (`NEXT_PUBLIC_API_BASE_URL`) and admin (`AUCTION_BACKEND_URL`), exactly like the Render URL.

## Verification checklist

- `GET https://<backend>.onrender.com/health` → ok.
- Storefront: product list loads, add to cart, checkout creates an order.
- Admin: Google sign-in works, product create (with image upload) and delete work, orders list shows the storefront order.
- Same order visible in both admin and storefront account history → data is consistent (one shared DB).

## Enabling S3/R2 image storage later (optional)

Set the `S3_*` (or `R2_*`) vars in the admin. When all of endpoint/bucket/keys/public-base are present, uploads go to object storage; otherwise images stay inline in MongoDB.
