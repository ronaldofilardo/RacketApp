# Deploy notes for RacketApp (Vercel + Neon)

This file describes the minimal environment variables and CI steps to deploy RacketApp to Vercel and ensure database migrations are applied.

Required environment variables (set in Vercel -> Project Settings -> Environment Variables or GitHub Secrets):

- DATABASE_URL: Postgres connection string (Neon). Example:
  - `postgresql://user:pass@host:5432/dbname?sslmode=require&channel_binding=require`
- VITE_API_URL (recommended): public base URL of the backend API (e.g. `https://racket-app-omega.vercel.app`). If not set, the frontend will use same-origin for requests when hosted on Vercel.
- SMOKE_API_URL (optional): URL used by CI to run smoke/e2e tests (typically same as VITE_API_URL).

CI / Migrations

- We added `.github/workflows/prisma-deploy-and-smoke.yml` which:
  1. Runs `pnpm exec prisma migrate deploy --schema backend/prisma/schema.postgres.prisma` using `DATABASE_URL` from secrets.
  2. Runs a smoke test script to validate the basic API flows.

Local testing

- To run the smoke test locally against a deployed URL:

  ```powershell
  $env:SMOKE_API_URL='https://racket-app-omega.vercel.app'
  node backend/scripts/smoke_test.mjs
  ```

- To run the E2E script (start + finish a match):

  ```powershell
  $env:SMOKE_API_URL='https://racket-app-omega.vercel.app'
  node backend/scripts/e2e_test.mjs
  ```

Notes

- Ensure `DATABASE_URL` is configured in Vercel for runtime. The build process now runs `prisma generate --schema prisma/schema.postgres.prisma` to avoid trying to read a local SQLite env var.
- Keep Prisma migrations committed in `backend/prisma/migrations` so `prisma migrate deploy` can apply them in CI/production.
