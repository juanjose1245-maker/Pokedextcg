# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal Pokédex/TCG collection tracker: a single-page web app (installable as a PWA) backed by a small Express server that persists which Pokémon the user owns. There are two independent collection "modes" — `bulk` (loose cards) and `carpetas` (cards organized into 4 fixed binders by generation) — tracked as separate id→date maps.

Comments and UI text in this codebase are in Spanish; keep new comments/strings consistent with that unless told otherwise.

## Running it

```bash
node server.js
```

Serves on port `3000`. In production it runs as the systemd unit `pokedex.service` (`WorkingDirectory=/var/www/html/pokedex-tcg`, `User=root`, auto-restarts on failure):

```bash
systemctl restart pokedex.service
systemctl status pokedex.service
journalctl -u pokedex.service -f
```

There is no build step — `public/` is served as-is via `express.static`, and `index.html` is a single file with inline `<style>` and `<script>` (no bundler, no framework).

No test suite exists (`npm test` is a placeholder that exits with an error).

### Auth

Write endpoints require a session, gated by `ADMIN_PASSWORD` env var (defaults to `pokedex123` with a startup warning if unset — always set this in production). Sessions are opaque tokens held in an in-memory `Map`, sent as an `httpOnly` cookie; there is no cookie-parser dependency, cookies are parsed by hand in `server.js`.

## Architecture

**`server.js`** — the entire backend, single file, organized in clearly delimited sections (look for `── SECTION ──` comment banners):
- Loads `pokemon_db.json` (static, pre-fetched Pokémon metadata: id/name/types/gen/image) as the read-only reference dataset.
- Loads/persists `inventario.json`, shaped `{ bulk: {id: {fecha}}, carpetas: {id: {fecha}} }`. On boot it auto-migrates an older flat-map format into this shape.
- Automatic daily backups of `inventario.json` into `backups/`, pruned to the last 14 files (also runs once at startup).
- Minimal hand-rolled session auth + a basic in-memory rate limiter (60 req/min/IP), both cleaned up periodically via `setInterval`.
- Read endpoints (`/api/buscar`, `/api/estadisticas`, `/api/exportar`) are always open, no login required.
- Write endpoints (`/api/inventario`, `/api/importar`) require `requiereLogin` + `rateLimiter`.
- `/api/eventos` is a Server-Sent Events stream: every inventory change is broadcast live to connected clients via `broadcast()`, so multiple open tabs/devices stay in sync without polling.

**`public/index.html`** — the entire frontend, single file (~2400 lines: styles, markup, and script all inline). Key things to know before editing it:
- `modoActual` (`bulk` | `carpetas`) is the global mode switch; most functions branch or namespace on it. `localStorage` keys are prefixed per-mode (`claveLS`, `claveFechaLS`) so the two modes never collide client-side.
- The server is the source of truth; `localStorage` is a mirror rebuilt from `/api/estadisticas` responses (`sincronizarLocalStorageDesde`) — don't assume client state is authoritative when reasoning about bugs.
- The 4 binders (`carpetas` array, ~line 900) are hardcoded by generation ranges (Gens 1-2 / 3-4 / 5-7 / 8-9), not user-configurable.
- Card scanning uses Tesseract.js (loaded from CDN, not npm) to OCR a camera feed and match recognized text against `pokemonDB` — see the `CÁMARA OCR` section near the end of the file (`toggleCamaraOCR`, `iniciarBucleOCR`).
- Theme (light/dark/auto) and mode are both persisted to `localStorage` and applied on load.

**`public/sw.js`** — PWA service worker. Only intercepts `GET`; all writes (`/api/login`, `/api/inventario`, `/api/importar`, etc.) always hit the network directly, by design, to avoid silent cross-device inconsistencies. `/api/buscar` and `/api/estadisticas` are network-first with a cache fallback for offline viewing; everything else (app shell, images) is cache-first.

## Data files (not code, but load-bearing)

- `pokemon_db.json` — the reference Pokédex data (1025 entries), regenerated via `fetch_pokemon.js` (hits pokeapi.co, one request per Pokémon; slow, run only when the reference data actually needs refreshing).
- `inventario.json` — live user collection state, `{ bulk, carpetas }`. Treat as data, not config; it's rewritten by the server on every change plus auto-backed-up.
- `migrar-carpetas-a-bulk.js` — a one-off, manually-run migration script that copies everything marked in `carpetas` into `bulk` (without overwriting existing `bulk` dates). Stop the server before running it; it writes its own timestamped backup first.

## Editing conventions

- Both `server.js` and `index.html` are intentionally single-file/monolithic — this is a small personal project, not scaffolded for multi-file modularization. Don't split them apart as a "cleanup" unless asked.
- When touching `inventario.json` handling, preserve the backup-before-write pattern used in `/api/importar` and `migrar-carpetas-a-bulk.js`.
- `bulk` and `carpetas` are always independent collections; a change to one must never implicitly affect the other unless explicitly requested (that's exactly what the migration script is for).
