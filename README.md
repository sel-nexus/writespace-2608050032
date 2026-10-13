# WriteSpace

A responsive browser-local blogging demo built with React 18, Vite 5, React Router 6 and Tailwind 3. All application code is in `frontend/`. No backend, API, server database, external image or font service is required.

## Features

- Public landing, latest three stored posts, login and registration.
- Protected newest-first library, plain-text reader, post creation and editing, character counter and inline validation.
- Ownership-aware editing/deletion: writers manage their own posts; admins moderate all posts.
- Responsive role-aware navigation, account disclosure and logout.
- Admin dashboard with real counts and latest five posts, account creation for either role and confirmed account deletion.
- Malformed/unavailable storage reads degrade gracefully; failed writes retain input and report actionable errors.

## Demo-only security boundary

**Never use real passwords or sensitive data.** Default administrator: **admin / admin**. Passwords are stored in plaintext in localStorage; client-side guards are not secure identity or server-enforced authorization. Anyone with access to the browser can inspect or modify data. This application is intentionally a non-sensitive local MVP, not a production multi-user service. Data stays in one browser profile and is not synchronized across browsers/devices. “Private & Local” describes location, not encryption.

Storage keys: `writespace_users`, `writespace_posts`, `writespace_session`. Sessions derive role/name from the current account; deleted accounts invalidate sessions. Default admin and the signed-in account cannot be deleted. Deleting another account retains its posts and recorded author attribution. Usernames are trimmed and exact/case-sensitive; duplicate post titles are allowed. Titles/content must contain non-whitespace text; content and line breaks are preserved. Sort ties use ascending IDs; dates display in English local calendar time. IDs require `crypto.randomUUID()` on HTTPS or localhost.

Dashboard Total Users includes the permanent administrator; Total Admins counts both permanent and created admins; Standard Writers counts user-role accounts. The permanent admin creation date is displayed as Permanent. These policies resolve unanswered PRD questions and are documented in the development plan.

## Run and verify

Use Node 20+; commands below run from `frontend/`:

```sh
npm ci --no-bin-links
node node_modules/vite/bin/vite.js
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview
node node_modules/@playwright/test/cli.js install chromium
node node_modules/@playwright/test/cli.js test
```

Direct Node scripts avoid executable-link issues on cross-platform mounts. Copy `.env.example` to `.env` for local settings; `.env` is ignored. Configurable development/preview/test ports are documented there. Static bundles have no runtime secrets. Playwright config starts its own Vite server and runs desktop Chrome and Pixel 7 with one worker. Fixtures capture and fail on browser errors. Tests cover real localStorage data and use UI links after initial entry.

Verified: 386 unit/component tests; 70 browser cases across four feature specs on desktop/mobile (initial full run 66 passed, four public-preview failures corrected in source, targeted identity rerun 40/40 passed). Independent test critic passed round 2 with score 1.0 and zero high failures. Production build passed. Source preflight captures accessibility trees, computed styles, HTML and screenshots for empty landing, login error, empty admin and populated reader on both viewports. Reproduce with a running preview and `node preflight.mjs`; evidence is saved under `frontend/preflight-evidence/`. Browser test screenshots are under `frontend/test-results/`.

## Deploy

For Vercel, set **Root Directory = frontend**, choose Vite, build `npm run build`, output `dist`. Root and tier `vercel.json` contain only the required SPA rewrite; configure the directory/build in the hosting UI. Deep client routes must fall back to index.html.

For Docker, `docker build -t writespace frontend` builds a two-stage static nginx image. Container listens on port 80; map a host port when running. Nginx uses `try_files $uri $uri/ /index.html`; `/healthz` returns ok. The frontend production build was verified directly; a container image was supplied but not built or run during this static-app stage. Vercel deployment itself was not executed.

## Dependency caution

Versions are pinned to the specified major lines. Initial installation reported 18 audit findings (4 moderate, 12 high, 2 critical), including legacy build/test tooling. No automatic major-version audit fix was applied. Review advisories and upgrade the toolchain before production use; this demo's plaintext identity model must also be replaced for real users.
