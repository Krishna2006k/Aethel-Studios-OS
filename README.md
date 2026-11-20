# Aethel Studios OS

Internal workspace for client operations, project delivery, finance, domains, and studio notes.

## Requirements

- Node.js 22 or newer (or a compatible Bun runtime)
- Install dependencies with `bun install --frozen-lockfile` or `npm install`
- Start development with `bun run dev`
- Run validation with `bun run lint`, `bun run test`, and `bun run build`

## Production access protection

Production mode requires two server-only environment variables:

- `AETHEL_ACCESS_PASSWORD`: shared workspace password, at least 12 characters.
- `AETHEL_SESSION_SECRET`: random signing secret, at least 32 characters. Generate one with `openssl rand -base64 48`.

Set both in the deployment platform's secret/environment-variable manager. Never prefix them with `VITE_`, put them in client code, or commit real values. Production workspace APIs fail closed when either value is missing or too short. The current sign-in model is a shared-password gate, not per-founder accounts or role-based access control.

For local development, copy `.env.example` to `.env`; it sets `NODE_ENV=development` so the access gate is disabled locally. The server loads `.env` at startup. A missing or unrecognized `NODE_ENV` is treated as production-like and requires authentication. Never deploy a `.env` file that sets `NODE_ENV=development`.

## Storage and cloud sync

The local JSON mirror is a convenience fallback, not durable production storage on ephemeral container platforms. Use a durable database or persistent volume before relying on it as the only copy of business records.

The Supabase schema restricts the state table to authenticated Supabase users. The current browser client uses an anon key and does not yet implement Supabase Auth sign-in; therefore remote Supabase reads/writes will be denied until that authentication flow is implemented. Do not re-enable a permissive `using (true)` policy to work around this.

## Monitoring and integrations

Domain status, SSL status, uptime, response time, and backup status are not automatically verified by the current app. The domain module now treats new records as unverified and opens the site for manual inspection. Meta Ads metrics are manually entered; no Meta Graph API sync is implemented. Automation switches store preferences only; there is no configurable background rule executor yet.

## Data safety

The factory seed is intentionally empty. Never commit live client records, credentials, API keys, or production snapshots. Vault credentials should be re-added through the encrypted vault with a strong, unique passphrase.

A previous seed fixture remains visible in the repository's Git history and contains credential-like values and personal details. They may have been sample values, but verify whether any correspond to real accounts. Rotate any matching live passwords, access tokens, API keys, and service-role credentials: deleting a value from the latest source tree does not remove it from prior commits. Do not rewrite shared Git history until maintainers have agreed on the recovery plan.
