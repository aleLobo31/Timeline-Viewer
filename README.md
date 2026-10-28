# Timeline-Viewer

Web app for guides to build history timelines and share them with tourists, who explore them on their phones.

Feature 1 (Timelines) implements the user stories in `requirements/F1-Timelines` and the quality requirements in `requirements/QualityREQ`.

## Stack

| Part              | Tech                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | React 18, Vite, React Router, TanStack Query, custom HTML/CSS timeline renderer                                              |
| `apps/api`        | Express 5, Prisma, PostgreSQL, Zod, argon2id, JWT in an httpOnly cookie, sharp, multer                                       |
| `packages/shared` | Zod schemas and pure domain rules used by both apps (password policy, event date rules, lane packing, timeframe and panning) |
| Tests             | Vitest (shared, web, API integration with Supertest), Playwright + axe (e2e, desktop and phone)                              |

## Getting started

Requirements: Node 22+, Docker and [mkcert](https://github.com/FiloSottile/mkcert) (local HTTPS certificates).

```bash
npm install
npm run certs                      # local HTTPS certificate in ./certs (not committed)
cp .env.example apps/api/.env      # adjust secrets if you like
npm run db:up                      # PostgreSQL (also creates the timeline_test database)
npm run db:migrate                 # apply the Prisma migration
npm run dev                        # api on https://localhost:4000, web on https://localhost:5173
```

Open https://localhost:5173. In development the web server proxies `/api` and `/uploads` to the API, so cookies work without CORS.

### HTTPS only

Both the API (`https.createServer`) and the Vite dev server serve HTTPS only; nothing listens on plain HTTP, so `http://` URLs simply fail to connect.

- `npm run certs` runs `mkcert -install` and writes `certs/localhost.pem` and `certs/localhost-key.pem`. To open the app from a phone on the LAN, add the computer's IP to the `mkcert` command in the `certs` script and regenerate.
- The API reads `TLS_KEY_FILE` and `TLS_CERT_FILE` (see `.env.example`) and refuses to start without them (except `NODE_ENV=test`, where Supertest runs in-process). In production use a certificate from a real CA.
- `WEB_ORIGIN` must be an `https://` origin; the API refuses to start otherwise.
- The session cookie is `HttpOnly`, `SameSite=Lax` and `Secure`. In production the API also sends HSTS (1 year, `includeSubDomains`); it is not sent in development so it does not force HTTPS on other `localhost` projects.
- The API does not trust `X-Forwarded-*` headers (no `trust proxy`) and answers 403 to any request that did not arrive over TLS.

### Database

There is a **single** migration, `apps/api/prisma/migrations/20261023124027_init`, that creates the whole database. Schema changes are made by editing that script (and `schema.prisma`), not by adding alterations. After such a change, or when pulling this change onto an existing database, recreate it:

```bash
npm run db:down -- -v && npm run db:up   # fresh PostgreSQL volume (dev and timeline_test)
npm run db:migrate
```

(or `npx prisma migrate reset` inside `apps/api` for the dev database only).

## Scripts

| Command                      | What it does                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                | API and web in watch mode                                          |
| `npm test`                   | Unit and integration tests of every workspace (needs the database) |
| `npm run test:e2e`           | Playwright end-to-end tests (starts API and web itself)            |
| `npm run lint` / `typecheck` | ESLint / TypeScript                                                |
| `npm run format`             | Prettier                                                           |

## How the user stories map to the code

| Story                          | Where                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1.1 create timeline           | `TimelineEditorPage` (collapsible `HeaderRow`: name, <= 100 character description, optional cover; breadcrumbs `Library / Timelines / name`), `PhonePreview`, `validateTimeline` (shared), `POST /api/timelines`                 |
| F1.2 events                    | `ItemSummaryRow` + `ItemCard` (row Year, Day, Month, icon button, image button, the last two without visible text; <= 300 words), `checkEventDates` (year/day/month rules), `TimelineView` (point = year + optional icon + name) |
| F1.3 / F1.4 processes, periods | `COLOR_PALETTE` (16 colors, picker button beside End year), `packLanes` (stacking), `layoutTimeline` (periods above processes above the axis); rounded rectangles, processes striped, name only (details on press)               |
| F1.5 share                     | `SharePanel` (modal opened from the share icon of each library card: link or QR), `POST /api/shares`, unguessable tokens, `GET /api/public/s/:token`                                                                             |
| F1.6 tourist viewer            | `SharedTimelinePage`, `validateTimeframe`, `panWindow`, `canPan`, `cutItems`                                                                                                                                                     |
| F1.7 / F1.8 profile, login     | `RegisterPage`, `LoginPage`, `auth.service` (argon2id), session cookie                                                                                                                                                           |
| F1.9 library                   | `LibraryPage` (+ box, type filter, share icon per card), `GET /api/materials`                                                                                                                                                    |
| F1.10 edit and delete          | `TimelineEditorPage` (`PUT` replaces the whole document atomically, owner-only, `DELETE`)                                                                                                                                        |

Quality requirements:

- **Q-1 responsive**: mobile-first CSS, text >= 16px for content, 44px touch targets. Playwright runs every flow on a Pixel 5 viewport and checks overflow, tap target size, font size and axe accessibility.
- **Q-2 no plaintext secrets**: passwords are stored only as argon2id hashes with the second recommended option of RFC 9106 (m = 65536 KiB, t = 3, p = 4, set in `apps/api/src/services/passwords.ts`); the API never returns them; the session cookie is httpOnly and Secure, and the whole app is served over HTTPS only. Covered by `apps/api/test/auth.test.ts`, `passwords.test.ts`, `https.test.ts` and `e2e/quality.spec.ts`.
- **Q-4 guide editor desktop-first**: the editor is laid out for desktop screens: a 2/3 editing zone (fixed header row, add buttons, scrolling list of summarised items sorted from most recent to oldest, inline form) and a 1/3 phone simulation with four move buttons. Below 1024px it only stacks. Phones are checked for the tourist viewer and the library, not for the editor. Library cards are large (>= 260px) and square.
- **Q-3 interactions under 1 s**: layout, validation and timeframe filtering are computed in the browser, images are resized to WebP on upload, the library endpoint is lean. `e2e/quality.spec.ts` measures select, timeframe and pan on a 300 item timeline.

## Assumptions

- Years are whole numbers and may be negative (BC).
- A subset timeframe is a fixed-width window; panning moves it inside the full range. With the whole timeline displayed there is nothing to move, so both arrows are disabled.
- "Historical periods above historical periods" in US-F1.4 is read as "above historical processes".
- The UI palette is navy blues, white and black. Success and failure are shown with text, icons and weight, not green or red. The 16 timeline colors (content chosen by the guide) are unchanged.
- The library cover is the optional image chosen by the guide in the editor. It is never taken from an event; without it the card is blank.
- Event icons are optional; descriptions are limited to 100 characters (timeline, US-F1.1 says "< 100 words") and 300 words (items). `requirements/F1-Timelines/US-F1.2` still lists the icon as mandatory; the code follows the newer decision.
- Sharing is done one timeline at a time: US-F1.5 says "select at least one timeline", but the library now has a share icon on each card (and no selection boxes) that opens a modal to choose link or QR. The API still accepts several ids.
- Tourist viewer: the year search (from / to, show timeframe, show all) is behind a hamburger button in the top right corner, and there are no on-screen earlier / later buttons or visible range. US-F1.6 still asks for left / right navigation, which is kept with the arrow keys (blocked at both edges); on a phone there is no control to move a cut timeline yet. The current range is still announced to screen readers.
- When event labels overlap they are placed at different heights; the stem of a lower event goes behind the labels above it instead of crossing their text.
- Images are stored on local disk behind a `StorageProvider` interface so they can move to S3-compatible storage later.
