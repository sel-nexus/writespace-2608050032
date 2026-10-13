# WriteSpace

A light editorial, browser-local blogging demo built with React 18, Vite 5, React Router 6, and Tailwind 3. Georgia display typography gives the writing a publication voice; Arial keeps forms and navigation legible. No external images or fonts are fetched.

## Current slice

Identity and shared scaffolding are implemented: public discovery with latest stored previews, responsive navigation, registration, login, validated local storage, session persistence, and logout. `/blogs` and `/admin` currently provide real account welcome and logout screens. Reading, publishing, permissions UI, and account management are later slices; their protected URLs currently lead to the same account welcome, not implemented content pages.

## Security boundary — demo only

**Do not use real passwords or sensitive data.** Credentials are plaintext in localStorage. Default administrator: **admin / admin** (special identifier `admin`). Browser-side guards are not secure identity or authorization. Accounts and posts are confined to one browser profile, not synchronized or shared across devices. Anyone with browser access can inspect or modify the data. “Private & Local” describes data location, not encryption.

Storage keys: `writespace_users`, `writespace_posts`, `writespace_session`. Reads validate complete schemas and return empty/null on malformed or unavailable data. Session role and display name are derived from the current account; missing/deleted accounts invalidate sessions. Writes throw readable UI errors. Registration rolls back the new account if session saving fails, where storage permits rollback. Username uniqueness is exact and case-sensitive; registration trims surrounding username/name whitespace, passwords remain exact. Generated IDs use `crypto.randomUUID()`; use HTTPS or localhost.

## Local commands

Use Node 20+, with commands run from `frontend/`:

```sh
npm install --no-bin-links
node node_modules/vite/bin/vite.js
node node_modules/vitest/vitest.mjs run tests/storage.test.js tests/auth.test.js tests/identity.test.jsx
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview
```

Direct Node scripts work without npm executable links. `.env.example` documents host/ports; `.env` contains matching nonsecret development defaults and must stay ignored. Vite defaults to `127.0.0.1:5173`, preview to `4173`, E2E to `5174`. These values are server configuration, not secrets or runtime configuration for built static files. No backend, API, or database service is needed.

## Browser tests (parent verification)

The slice includes Playwright 1.48.2 specs for desktop and mobile, using one worker. The shared page fixture captures console/page errors before entry and asserts none at teardown. It starts Vite automatically from the tier-local config. After independent review, the parent can install Chromium and run:

```sh
node node_modules/@playwright/test/cli.js install chromium
node node_modules/@playwright/test/cli.js test
```

E2E is authored but not executed by the identity builder. Unit tests and build are the builder's permitted verification scope. Tests do not implement later publishing or admin journeys.

## Deployment

For Vercel, set **Root Directory = frontend** in the hosting UI, select Vite, set the build to `npm run build` and output to `dist`. Both root and tier `vercel.json` deliberately contain **only** the required SPA rewrite. Hosting UI settings, not extra JSON keys, select the tier.

For Docker, build with `frontend/` as context (`docker build -t writespace frontend`), then expose container port 80. The two-stage Dockerfile builds static `dist/` and nginx serves it, with `try_files $uri $uri/ /index.html` for deep-route reloads. `/healthz` returns `ok`. No runtime secrets or backend proxy exist.

## Dependency caution

Versions are pinned to the requested stable major lines, including the requested Playwright 1.48.2 accessibility-snapshot compatibility. Initial npm installation reported 18 audit findings (4 moderate, 12 high, 2 critical). Do not treat this legacy toolchain or local identity demo as production-safe; review advisories and upgrade tooling before any production use. No automatic audit fix was applied because it may change the mandated versions.
