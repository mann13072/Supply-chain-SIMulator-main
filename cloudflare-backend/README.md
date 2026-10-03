# SolarChain Cloudflare backend

This folder is the Cloudflare Workers copy of `../backend`. The local
`../backend` (run by `npm run dev`) is unchanged and keeps its own data.

## Live backend

https://solarchain-backend.upply-chain----ulator-cloudflare-backend.workers.dev

Health: `/health`. API documentation: `/docs`.

Cloudflare runs the Python FastAPI app in one SQLite-backed Durable Object.
User accounts, saved networks, and compressed simulation histories are stored
in its durable SQLite database. The shared routing graph (default scenario plus
hub atlas) is rebuilt in memory on each start and never stores user nodes; the
old `/api/nodes`, `/api/routes` and `/api/state` endpoints were removed. An older
`network_state` key may remain in the object's key-value storage but is no longer
read. The cloud database starts fresh; local users and saved data
have not been migrated. Create a cloud account to save private networks and runs.

AI analysis is disabled. No Gemini key was uploaded. Only a newly generated
`JWT_SECRET` was installed as a Cloudflare Worker secret.

## Deploy future backend changes

From this folder, with Wrangler signed in:

```powershell
$env:WRANGLER_SEND_METRICS = 'false'
uv run pywrangler deploy
```

Keep the Worker name, Durable Object binding, and existing migration tag stable
to retain the same storage. Do not deploy files from the original backend with
this configuration: its database, password hashing, and filesystem assumptions
differ from the Worker copy.

## Local development

The original `../frontend` and `../backend` still run with `npm run dev`.

To run this Worker copy locally instead, create an untracked `.dev.vars` file
containing a separate development `JWT_SECRET`, then run:

```powershell
uv run pywrangler dev
```

Wrangler uses local Durable Object storage for this mode. Local data and cloud
data are separate. No development server was left running during deployment.

## Frontend connection

The Vercel frontend changes live on the git branch `codex/cloudflare-deployment`
of this repo (`git switch codex/cloudflare-deployment` to edit them). Its API
requests use the same origin; Vercel rewrites `/api/*` and `/auth/*` to this Worker.
The main branch frontend is unchanged.

This deployment enables login for private cloud saves and disables the AI UI.
It uses distinct browser session keys to avoid reusing old Railway logins.

Vercel production now tracks `codex/cloudflare-deployment`. Deployment
`9avxqbiNfeq1f7fd1cCDTQMibMkR` is Ready and serves
https://supply-chain-si-mulator-main.vercel.app/ from commit `15d9084`.
Future changes to the original `main` branch will not automatically replace this
cloud deployment. Publish frontend updates from the Cloudflare deployment branch.
Backend updates still use `uv run pywrangler deploy` from this backend folder.

## Compatibility and validation

- Native bcrypt was replaced with salted PBKDF2-SHA256 (100,000 iterations) for
  cloud accounts. Pyodide's `hashlib` has no `pbkdf2_hmac`, so the Worker uses
  WebCrypto, which caps PBKDF2 at 100,000 iterations.
- SQLAlchemy uses an adapter for the Durable Object SQL API and synchronous
  transactions; table reflection is restricted to the persistent main schema.
  Row counts come from `changes()`, because the API's `rowsWritten` also counts
  index writes.
- PDF import uses pypdf text extraction. Scanned PDFs need OCR elsewhere, and
  complex table layouts may import less accurately than the original reader.
- Cold starts may take several seconds while Python dependencies initialize.
- Local validation under `pywrangler dev` passed register, login, wrong-password
  401, duplicate-email 409, network and run CRUD, and run sharing.
- Live checks passed health, the 13,854-port atlas, hubs, routing state,
  protected saves returning 401 without login, disabled AI returning 503, and
  CORS for the Vercel production domain.
- The same API checks passed through Vercel's production proxy, including a
  database-backed invalid-login query returning 401 without creating test users.
- The frontend passed `npm.cmd run lint` and `npm.cmd run build`; its live landing,
  login, and registration pages were inspected in Chrome.

## Free hosting

SQLite-backed Durable Objects are available on Workers Free. Free daily limits
include 100,000 Durable Object requests, 5 million row reads, and 100,000 row
writes, with 5 GB total SQLite storage. Workers request limits also apply.
This deployment does not require a paid-plan upgrade; usage must remain within
the account's free limits.

Sources: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
