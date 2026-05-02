# New Pawnshop Backend

Express API for `new-pawnshop-front` and `new-pawnshop-admin`.

## Current state

- TypeScript build and runtime scripts are configured.
- Environment variables are validated on startup.
- `helmet`, CORS allowlist and rate limiting are enabled.
- Auth controller validates basic input and hides internal 500 messages.
- Backward-compatible routes are still exposed for existing clients.

## Architecture

- The backend is closer to a service-layer architecture than to a true feature-based one.
- Current folders are technical layers: `controllers`, `routes`, `services`, `models`, `middlewares`.
- Shared request parsing now lives in `src/utils/request.ts` to reduce duplication across controllers.
- Recommended next step is to group code by domains such as `auth`, `products`, `categories`, `orders`, `auctions`, each with route/controller/service/model modules.

## Required environment variables

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace-with-strong-secret
CORS_ORIGINS=https://shop.example.com,https://admin.example.com
AUCTION_ADMIN_TOKEN=replace-with-strong-service-token
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Production checklist

- Put the API behind HTTPS and a reverse proxy.
- Store secrets in a real secret manager.
- Restrict `CORS_ORIGINS` to exact production domains.
- Rotate `JWT_SECRET` and `AUCTION_ADMIN_TOKEN`.
- Add request logging, audit logging and backup/restore procedures.
- Run `npm audit` and upgrade vulnerable packages before release.

Current implementation notes:

- Basic structured request logging is enabled.
- Audit logs are emitted for order, product and category create/update/delete flows.

## Legal and compliance scope

This repository now contains technical production safeguards, but a pawnshop or pawn-loan product still needs legal sign-off before release. In particular, review:

- regulated pawnshop activity registration and customer disclosures,
- consumer withdrawal/complaint flows,
- GDPR retention rules and data processing register,
- AML/KYC checks if the business model includes pawn loans, redemption, high-value goods or suspicious transaction handling,
- evidence trail for ownership verification and item provenance.

## Planned legal work

- Finalize business terms for pawn loans, redemption periods and sale after missed repayment.
- Add legally reviewed templates for complaint handling, withdrawal notices and mandatory pre-contract information.
- Define AML/KYC decision points, sanctions screening and escalation flow.
- Define retention periods for identity data, contracts, bids, orders and security logs.
