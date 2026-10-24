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

Requirements: Node 22+ and Docker.

```bash
npm install
cp .env.example apps/api/.env      # adjust secrets if you like
npm run db:up                      # PostgreSQL (also creates the timeline_test database)
npm run db:migrate                 # apply Prisma migrations
npm run dev                        # api on :4000, web on :5173
```

Open http://localhost:5173. In development the web server proxies `/api` and `/uploads` to the API, so cookies work without CORS.

## Scripts

| Command                      | What it does                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                | API and web in watch mode                                          |
| `npm test`                   | Unit and integration tests of every workspace (needs the database) |
| `npm run test:e2e`           | Playwright end-to-end tests (starts API and web itself)            |
| `npm run lint` / `typecheck` | ESLint / TypeScript                                                |
| `npm run format`             | Prettier                                                           |

## How the user stories map to the code

| Story                          | Where                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1.1 create timeline           | `TimelineEditorPage` (collapsible `HeaderRow`: name, <= 100 character description, optional cover; breadcrumbs `Library / Timelines / name`), `PhonePreview`, `validateTimeline` (shared), `POST /api/timelines`   |
| F1.2 events                    | `ItemSummaryRow` + `ItemCard` (row Year, Day, Month, icon button, image button; <= 300 words), `checkEventDates` (year/day/month rules), `TimelineView` (point = year + optional icon + name)                      |
| F1.3 / F1.4 processes, periods | `COLOR_PALETTE` (16 colors, picker button beside End year), `packLanes` (stacking), `layoutTimeline` (periods above processes above the axis); rounded rectangles, processes striped, name only (details on press) |
| F1.5 share                     | `SharePanel` (link or QR), `POST /api/shares`, unguessable tokens, `GET /api/public/s/:token`                                                                                                                      |
| F1.6 tourist viewer            | `SharedTimelinePage`, `validateTimeframe`, `panWindow`, `canPan`, `cutItems`                                                                                                                                       |
| F1.7 / F1.8 profile, login     | `RegisterPage`, `LoginPage`, `auth.service` (argon2id), session cookie                                                                                                                                             |
| F1.9 library                   | `LibraryPage` (+ box, type filter, selection for sharing), `GET /api/materials`                                                                                                                                    |
| F1.10 edit and delete          | `TimelineEditorPage` (`PUT` replaces the whole document atomically, owner-only, `DELETE`)                                                                                                                          |

Quality requirements:

- **Q-1 responsive**: mobile-first CSS, text >= 16px for content, 44px touch targets. Playwright runs every flow on a Pixel 5 viewport and checks overflow, tap target size, font size and axe accessibility.
- **Q-2 no plaintext secrets**: passwords are stored only as argon2id hashes; the API never returns them; the session cookie is httpOnly. Covered by `apps/api/test/auth.test.ts` and `e2e/quality.spec.ts`.
- **Q-4 guide editor desktop-first**: the editor is laid out for desktop screens: a 2/3 editing zone (fixed header row, add buttons, scrolling list of summarised items sorted from most recent to oldest, inline form) and a 1/3 phone simulation with four move buttons. Below 1024px it only stacks. Phones are checked for the tourist viewer and the library, not for the editor. Library cards are large (>= 260px) and square.
- **Q-3 interactions under 1 s**: layout, validation and timeframe filtering are computed in the browser, images are resized to WebP on upload, the library endpoint is lean. `e2e/quality.spec.ts` measures select, timeframe and pan on a 300 item timeline.

## Assumptions

- Years are whole numbers and may be negative (BC).
- A subset timeframe is a fixed-width window; panning moves it inside the full range. With the whole timeline displayed there is nothing to move, so both arrows are disabled.
- "Historical periods above historical periods" in US-F1.4 is read as "above historical processes".
- The UI palette is navy blues, white and black. Success and failure are shown with text, icons and weight, not green or red. The 16 timeline colors (content chosen by the guide) are unchanged.
- The library cover is the optional image chosen by the guide in the editor. It is never taken from an event; without it the card is blank.
- Event icons are optional; descriptions are limited to 100 characters (timeline, US-F1.1 says "< 100 words") and 300 words (items). `requirements/F1-Timelines/US-F1.2` still lists the icon as mandatory; the code follows the newer decision.
- Images are stored on local disk behind a `StorageProvider` interface so they can move to S3-compatible storage later.
