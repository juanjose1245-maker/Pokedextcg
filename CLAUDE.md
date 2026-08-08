# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hostable Pokédex/TCG collection tracker: a single-page web app (installable as a PWA) backed by a small Express server that persists which Pokémon the user owns. There are two independent collection "modes" — `bulk` (loose cards) and `carpetas` (cards organized into 1-9 user-configurable binders, either by generation or by a contiguous Pokédex-number range) — tracked as separate id→date maps.

Comments and UI text in this codebase are in Spanish; keep new comments/strings consistent with that unless told otherwise.

## Running it

```bash
node server.js
```

Serves on port `3000`. The general-purpose way to self-host this (what `README.md` walks anyone else through) is the Docker image — see "Self-hosting / Docker" below. What follows in this section is specific to the original author's own instance, which instead runs as the systemd unit `pokedex.service` (`WorkingDirectory=/var/www/html/pokedex-tcg`, `User=www-data`, auto-restarts on failure) with a GitHub webhook triggering `git pull` + restart on push to `main` — not something a Docker deploy needs or has. Files the process needs to write (`inventario.json`, `carpetas.json`, `backups/`, `cache/`, `node_modules/`, `package.json`/`package-lock.json` for `/api/webhook-deploy`'s `npm install`) must be owned by `www-data`, and `/var/www/.npm` (npm's cache dir, under `www-data`'s home) must exist and be owned by `www-data` too — otherwise auto-deploy/writes fail with `EACCES`:

```bash
systemctl restart pokedex.service
systemctl status pokedex.service
journalctl -u pokedex.service -f
```

There is no build step — `public/` is served as-is via `express.static`. `index.html` is markup only; styles and script live in the sibling `styles.css`/`app.js` (no bundler, no framework, see Architecture below).

No test suite exists (`npm test` is a placeholder that exits with an error).

### Auth

Write endpoints require a session. There is no preset password: `admin-password.json` (in `DATA_DIR`, scrypt hash + salt, gitignored) starts out absent, `GET /api/auth-estado` tells the client so, and the first write attempt shows a "set your password" form instead of a login form (`POST /api/definir-password`, one-time — 409 if already configured). An `ADMIN_PASSWORD` env var is still honored as a one-time migration on boot if `admin-password.json` doesn't exist yet (hashed once and written to disk; the env var itself is never consulted again after that). Sessions are opaque tokens held in an in-memory `Map`, sent as an `httpOnly` cookie; there is no cookie-parser dependency, cookies are parsed by hand in `server.js`.

## Architecture

**`server.js`** — the entire backend, single file, organized in clearly delimited sections (look for `── SECTION ──` comment banners):
- Loads `pokemon_db.json` (static, pre-fetched Pokémon metadata: id/name/types/gen/image) as the read-only reference dataset.
- Loads/persists `inventario.json`, shaped `{ bulk: {id: {fecha}}, carpetas: {id: {fecha}} }`. On boot it auto-migrates an older flat-map format into this shape.
- Automatic daily backups of `inventario.json` into `backups/`, pruned to the last 14 files (also runs once at startup).
- Minimal hand-rolled session auth + a basic in-memory rate limiter (60 req/min/IP), both cleaned up periodically via `setInterval`.
- Read endpoints (`/api/buscar`, `/api/estadisticas`, `/api/exportar`, `/api/carpetas-config`, `/api/pdf-carpetas`) are always open, no login required.
- Write endpoints (`/api/inventario`, `/api/importar`, `/api/carpetas-config` POST) require `requiereLogin` + `rateLimiter`.
- `app.set('trust proxy', 1)` is required because of the reverse-proxy setup described below — without it `req.ip` (used by the rate limiter) always resolves to the proxy's address instead of the real client IP.
- `/api/eventos` is a Server-Sent Events stream: every inventory change is broadcast live to connected clients via `broadcast()`, so multiple open tabs/devices stay in sync without polling.
- `/api/webhook-deploy` is a GitHub webhook for auto-deploy: verifies an HMAC-SHA256 signature (header `X-Hub-Signature-256`, secret in `DEPLOY_WEBHOOK_SECRET` env var) on pushes to `main`, then runs `git fetch && git reset --hard origin/main` + `npm install` and exits the process on purpose so systemd's `Restart=on-failure` brings it back up on the new code. Disabled (503) if `DEPLOY_WEBHOOK_SECRET` isn't set. Because it's a hard reset, any uncommitted local change to a tracked file is destroyed the moment a push lands on `main`.
- The 4 folders/binders are **not** hardcoded — they live in `carpetas.json` (validated by `carpetasConfigValida`, which also enforces unique folder names since `/api/pdf-carpetas` identifies folders by name) and are configured from the client via a wizard (see below). `CARPETAS_DEFAULT` in `server.js` is only the seed used the first time `carpetas.json` doesn't exist.

**`public/index.html`** — markup only (~420 lines), no inline `<style>` or `<script>`. Styles live in **`public/styles.css`** and the script in **`public/app.js`** (~2100 lines) — no bundler, plain `<link>`/`<script>` tags loaded by `index.html`. Key things to know before editing:
- `modoActual` (`bulk` | `carpetas`) is the global mode switch; most functions branch or namespace on it. `localStorage` keys are prefixed per-mode (`claveLS`, `claveFechaLS`) so the two modes never collide client-side.
- The server is the source of truth; `localStorage` is a mirror rebuilt from `/api/estadisticas` responses (`sincronizarLocalStorageDesde`) — don't assume client state is authoritative when reasoning about bugs.
- Folders are configured through a wizard (`abrirWizardCarpetas` and the `wizard*` functions in `app.js`) that supports two layouts: `separadas` (each folder = a set of whole generations) and `seguidas` (each folder = a contiguous national-Pokédex-number range). The chosen config is persisted server-side via `/api/carpetas-config`.
- Card scanning uses Tesseract.js, vendored locally under `public/vendor/tesseract/` (not npm, not CDN) to OCR a camera feed and match recognized text against `pokemonDB` — see the `CÁMARA OCR` section near the end of `app.js` (`toggleCamaraOCR`, `iniciarBucleOCR`).
- Theme (light/dark/auto) and mode are both persisted to `localStorage` and applied on load.

**`public/sw.js`** — PWA service worker. Only intercepts `GET`; all writes (`/api/login`, `/api/inventario`, `/api/importar`, etc.) always hit the network directly, by design, to avoid silent cross-device inconsistencies. `/api/buscar`, `/api/estadisticas`, and every other `/api/*` GET are network-first/network-only; everything else (app shell — `index.html`, `app.js`, `styles.css`, fonts, icons — plus images) is cache-first.

**Gotcha (bit us repeatedly): bump `CACHE_VERSION` in `sw.js` in the SAME commit as any change to `index.html`, `app.js`, or `styles.css`.** The browser only re-checks/re-installs the service worker when `sw.js`'s own bytes change — if you edit the app shell files without touching `sw.js`, browsers keep serving the stale cached shell indefinitely (surviving even "clear site data" in some cases), with zero errors to signal it. There's no build step to catch this automatically, so it's a manual discipline: touched the shell? Bump the version.

## Data files (not code, but load-bearing)

- `pokemon_db.json` — the reference Pokédex data: 1025 base entries (ids 1-1025, one per species, regenerated via `fetch_pokemon.js` — hits pokeapi.co, one request per Pokémon; slow, run only when the reference data actually needs refreshing) plus variant entries appended after id 1025 (see `variantes_lista.json`/`fetch_variantes.js` below).
- `variantes_lista.json` — research list (not runtime) of Pokémon variants (regional forms, Mega, Gigamax, alternate forms with their own TCG card) by form name in PokeAPI + category + base species. Consumed by `fetch_variantes.js`.
- `fetch_variantes.js` — extends `pokemon_db.json`'s 1025 base entries with variants from `variantes_lista.json`; safe to re-run any number of times (it always regenerates the variant tail from scratch based on whatever's currently in `variantes_lista.json`), fails loudly instead of writing a partial result if PokeAPI errors on any entry, and refuses to write if two variants resolve to identical artwork (the same physical card counted twice). **Regeneration order: if you run `fetch_pokemon.js`, always run `fetch_variantes.js` after it** — `fetch_pokemon.js` overwrites the entire file with only the 1025 base entries and silently deletes any existing variants.
- `inventario.json` — live user collection state, `{ bulk, carpetas }`. Treat as data, not config; it's rewritten by the server on every change plus auto-backed-up. Gitignored on purpose — unlike `carpetas.json`/`variantes-config.json`, it must never be tracked, since `/api/webhook-deploy`'s `git reset --hard origin/main` would otherwise overwrite the live collection with whatever stale copy is committed.
- `carpetas.json` — the folder/binder layout (`{ modo: 'separadas'|'seguidas', carpetas: [...] }`), written by the client-side wizard through `/api/carpetas-config`. Falls back to `CARPETAS_DEFAULT` (in `server.js`) if missing or invalid.

## Self-hosting / Docker

`DATA_DIR` (env var, defaults to `__dirname`) is where all writable state lives — `inventario.json`, `carpetas.json`, `variantes-config.json`, `admin-password.json`, `backups/`. The Docker image (`Dockerfile`, `docker-entrypoint.sh`) fixes it to `/app/data` and mounts that as a volume; running `node server.js` directly (no `DATA_DIR` set) keeps everything next to the repo, same as before this existed. `docker-entrypoint.sh` starts as root only to `chown` `DATA_DIR` (handles a bind-mount owned by anyone) then drops to the non-root `node` user via `setpriv` before exec'ing the app. `.github/workflows/docker-publish.yml` builds and pushes `ghcr.io/juanjose1245-maker/pokedextcg:latest` (amd64+arm64) on every push to `main`, passing the short SHA in as `GIT_COMMIT` (`.git` itself isn't in the image — see `.dockerignore` — so `server.js` can't `git rev-parse` in that environment; it reads `GIT_COMMIT` first and only falls back to `git rev-parse` when that's unset).

## i18n

`public/i18n.js` holds the ES/EN dictionary; static text in `index.html` is wired via `data-i18n`/`data-i18n-placeholder`/`data-i18n-title` attributes, dynamic strings from `app.js` call `t('key')`. Language auto-detects from the browser on first load and is overridable in Ajustes, persisted to `localStorage`. Server error responses are codes (e.g. `password_incorrecta`, `rate_limit`), translated client-side — never hardcode a Spanish or English string in a server response body.

## Editing conventions

- `server.js` and the `public/` app shell (`index.html` + `app.js` + `styles.css`) are intentionally monolithic within each concern (no per-feature files, no framework/bundler) — this is a small personal project, not scaffolded for multi-file modularization. Don't split them apart further as a "cleanup" unless asked.
- When touching `inventario.json` handling, preserve the backup-before-write pattern used in `/api/importar`.
- `bulk` and `carpetas` are always independent collections; a change to one must never implicitly affect the other unless explicitly requested.
