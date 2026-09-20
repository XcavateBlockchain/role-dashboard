# realXmarket · Role Dashboard

Admin dashboard for the **xcavate-whitelist** Solana program (devnet): a wallet-gated
single-page app for manual assignment and management of on-chain roles. The operator
connects a browser wallet, and every write is a real on-chain transaction signed in the
browser; every read comes from the realXmarket indexer's GraphQL API.

## Features

One control surface for each of the nine xcavate-whitelist instructions:

- **Initialize config** — one-time creation of the singleton config (sets the sudo
  authority; only the program's upgrade authority can call it).
- **Propose authority** — nominate a new sudo authority.
- **Accept authority** — the nominee completes the two-step authority handover.
- **Add admin** / **Remove admin** — manage the whitelist admin set (sudo-only).
- **Assign role** / **Remove role** — grant or revoke a role for any wallet (admin-only;
  new assignments start Compliant).
- **Renounce role** — a wallet gives up its own role.
- **Set compliance** — flip a (user, role) assignment between Compliant and Revoked.

Plus:

- **All reads via the indexer** — config, admins, role assignments and compliance state
  come from the realXmarket indexer GraphQL API (proxied through `/api/graphql`, so the
  browser never talks to the indexer directly).
- **Wallet Standard** — works with any Wallet Standard browser wallet (Phantom,
  Solflare, Backpack, …); no wallet-specific adapters.
- **Solana devnet + Alchemy RPC** — transactions are signed in the browser and sent
  through the server-side `/api/rpc` proxy, which appends the Alchemy key so it never
  reaches the client.
- Visual style adapted from the realXmarketMobileApp design language.

## Stack

Nuxt 4 (SPA mode, `ssr: false` — Nitro serves only the `/api/rpc` and `/api/graphql`
proxies) · Vue 3.5 · Tailwind CSS v4 · @anchor-lang/core · @solana/web3.js ·
Solana Wallet Standard.

## Environment variables

All values are read at **container/server start** (Nuxt `NUXT_*` runtime convention) —
changing them never requires a rebuild, only a restart.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NUXT_ALCHEMY_API_KEY` | yes | — | Alchemy key with Solana devnet enabled. Used server-side by the `/api/rpc` proxy (appended to the RPC URL); never shipped to the browser. |
| `NUXT_ALCHEMY_RPC_URL` | no | `https://solana-devnet.g.alchemy.com/v2/` | RPC endpoint base the key is appended to. |
| `NUXT_INDEXER_URL` | yes in prod | `http://localhost:3010/graphql` | GraphQL endpoint of the realXmarket indexer — all dashboard reads are proxied here via `/api/graphql`. The deployed container uses `http://host.docker.internal:3010/graphql` (indexer on the same host). |
| `NUXT_PUBLIC_CLUSTER` | no | `devnet` | Cluster the wallet connects to; shown in the UI. |
| `NUXT_PUBLIC_PROGRAM_ID` | no | `7TrzjKpdrEhnfhxuw8tWdH1sjxadazscsG5HXCDPLmaY` | xcavate-whitelist program id. |

## Local development

```bash
cp .env.example .env   # then fill in NUXT_ALCHEMY_API_KEY
npm install
npm run dev            # http://localhost:3000
```

The dashboard's reads need a reachable indexer at `NUXT_INDEXER_URL`. Either run one
locally (see the Indexer repo) or tunnel the deployed one:

```bash
ssh -L 3010:localhost:3010 deploy@<hetzner-host>
```

## Docker

```bash
docker build -t role-dashboard .
docker run --env-file .env -p 3000:3000 role-dashboard
# on Linux, if NUXT_INDEXER_URL points at host.docker.internal, add:
#   --add-host=host.docker.internal:host-gateway
```

or with compose (the `host.docker.internal` mapping is already in the file):

```bash
cp .env.example .env   # fill in NUXT_ALCHEMY_API_KEY
docker compose up -d --build
```

The image is a three-stage `node:22-alpine` build (deps → `nuxt build` → runner with
only `.output/`, non-root `node` user, busybox-`wget` healthcheck on `/`).

## Deployment (GitHub Actions → GHCR → Hetzner)

Same pattern as the Indexer repo: CI builds the image and pushes it to GHCR
(`ghcr.io/<owner>/role-dashboard`, tagged `latest` + commit SHA); the server only pulls
and runs it. No source code or `npm` on the server.

What the workflow (`.github/workflows/deploy.yml`, on push to `main` or manual dispatch)
does:

1. Builds and pushes `ghcr.io/<owner>/role-dashboard:latest` + `:<sha>` with buildx.
2. Renders a fresh `/opt/role-dashboard/.env` on the server from the repository secrets —
   pinning `DASHBOARD_IMAGE` to the just-built SHA tag and writing the `NUXT_*` runtime
   config — then uploads `docker-compose.yml` alongside it. The `.env` is replaced
   wholesale on every deploy, so hand edits on the server do not survive: the GitHub
   secrets below are the only place to configure the deployment.
3. `docker compose pull && docker compose up -d --remove-orphans`, then a smoke check
   (`curl -fsS http://localhost:3000/` from the server, 12 × 5 s retry loop — the job
   fails and dumps container logs if the dashboard doesn't come up), then prunes images
   unused for 7+ days.

### Required GitHub secrets

`Settings → Secrets and variables → Actions`. The Hetzner connection secrets use the
exact same names as the Indexer repo — if both repos deploy to the same server, the same
values (and the same `deploy` user / SSH key) work for both.

| Secret | Required | Value |
|---|---|---|
| `HETZNER_HOST` | yes | Server IP or hostname. |
| `HETZNER_USER` | yes | SSH user with docker rights (`deploy`). |
| `HETZNER_SSH_KEY` | yes | Contents of the **private** deploy key. |
| `HETZNER_SSH_PORT` | no | SSH port, defaults to `22`. |
| `HETZNER_KNOWN_HOSTS` | no (recommended) | Output of `ssh-keyscan -H <host>`; pins the host key (otherwise the workflow trusts on first use). |
| `ALCHEMY_API_KEY` | yes | Alchemy key with Solana devnet enabled → written to the server `.env` as `NUXT_ALCHEMY_API_KEY`. The deploy fails fast if unset. |
| `INDEXER_URL` | no | GraphQL endpoint of the indexer → `NUXT_INDEXER_URL`. Unset = `http://host.docker.internal:3010/graphql` (the indexer publishing on host port 3010 on the same server). |
| `GHCR_PULL_TOKEN` | no | PAT with `read:packages`; only needed while the GHCR package is private. Alternatively make the package public and omit this. |

Secret values must not contain single quotes or newlines — the render step rejects them
with a clear error instead of writing a corrupt `.env`.

### First-time server setup

Any Debian/Ubuntu Hetzner server with Docker. If the Indexer stack is already deployed
there, everything below except the deploy directory already exists.

```bash
# Docker Engine + compose plugin (official convenience script), if not present
curl -fsSL https://get.docker.com | sh

# Deploy directory owned by the same deploy user the Indexer repo uses
mkdir -p /opt/role-dashboard
chown deploy:deploy /opt/role-dashboard

# The deploy user's SSH authorized_keys must contain the public half of the key
# whose private half is the HETZNER_SSH_KEY secret (same key as the Indexer repo
# works fine).
```

Firewall (ufw or Hetzner Cloud firewall): keep allowing `22` (SSH). Port `3000` only
needs to be open if the dashboard should be reachable directly from outside — otherwise
leave it closed and either put it behind the existing reverse proxy or tunnel it:

```bash
ssh -L 3000:localhost:3000 deploy@<host>   # then open http://localhost:3000
```

The indexer it talks to is on the same host (published on `3010`); the dashboard
container reaches it via `host.docker.internal` — no extra network plumbing needed.

### Rollback

Fastest is on the server: edit `/opt/role-dashboard/.env` to point `DASHBOARD_IMAGE` at
an earlier SHA tag and `docker compose up -d` (images from the last 7 days are still
present locally; older ones re-pull from GHCR). Via GitHub: open the last good run of
the Deploy workflow and choose **Re-run all jobs**, or `git revert` and push.

## Credits

Built by the realXmarket team. Visual style adapted from
[realXmarketMobileApp](https://github.com/RealXmarket); deployment conventions mirror
the realXmarket Indexer repo. Powered by Nuxt, Anchor and the Solana Wallet Standard.
