# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite HMR)
npm run build     # type-check + production build (tsc -b && vite build)
npm run lint      # ESLint across all files
npm run preview   # preview the production build locally
```

There is no test suite configured. Type errors surface via `npm run build`.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in Firebase credentials. The app has hardcoded fallback Firebase values in `src/lib/firebase.ts` pointing to the `famliy-app-planning` project, so the app runs without `.env.local` during development.

## Architecture Overview

This is a React 19 + TypeScript PWA (mobile-first, portrait orientation) built with Vite. It uses Firebase as the sole backend.

### Data Flow

All application state lives in a single Zustand store (`src/store/index.ts`). Two hooks bootstrap it on mount inside `AppContent` in `src/App.tsx`:

- **`useAuth`** (`src/hooks/useAuth.ts`) — subscribes to Firebase Auth state, then opens a Firestore `onSnapshot` listener on the user's profile document. On profile load it also fetches the family document and writes both into the store.
- **`useRealtimeData`** (`src/hooks/useRealtimeData.ts`) — once a `familyId` is available in the store, opens five parallel `onSnapshot` listeners (shopping, tasks, events, family members, announcements) and writes incoming data into the store via setters.

All Firestore operations (CRUD + subscriptions) are centralised in `src/lib/firestore.ts`. Page components read from the store and call firestore helpers directly — there is no intermediate service layer.

### Routing & Auth Guards

`src/App.tsx` implements three routing states based on store values:

1. `isAuthLoading === true` → loading spinner
2. `currentUser === null` → unauthenticated routes (`/login`, `/register`, `/register-google`, `/join`)
3. `family === null` → family-setup routes (`/setup`, `/join`)
4. Both present → main app wrapped in `MainLayout` with bottom-tab navigation

### Collections & Firestore Rules

Firestore collections: `families`, `users`, `shopping`, `tasks`, `events`, `announcements`.

Security model (enforced in `firestore.rules`):
- All reads/writes require the user's `familyId` to match the document's `familyId`.
- `parent` role users have elevated permissions (approve shopping items, delete any task, pin announcements, update family settings).
- `child` role users can only update their own assigned tasks and items they created.

### i18n

The app is bilingual (Hebrew default, English). Translations live in `src/i18n/he.json` and `src/i18n/en.json`. Language change also flips `document.documentElement.dir` between `rtl` (Hebrew) and `ltr` (English) — this affects all CSS layout. Always test UI changes in both directions.

Use the `useTranslation` hook from `react-i18next` in components; call `setAppLanguage` from `src/i18n/index.ts` to switch language globally.

### Styling

Tailwind CSS with a custom `primary` color scale (sky blue, `#0ea5e9` base) and a `family` color palette defined in `tailwind.config.js`. The font stack is Heebo first (RTL-friendly) then Inter. Use the `animate-fade-in` and `animate-slide-up` utility classes for entrance animations. The `@` alias resolves to `src/`.

### Google Calendar Integration

`src/lib/googleCalendar.ts` handles OAuth token acquisition (re-triggers Google sign-in with `calendar.readonly` scope), fetches events from the Google Calendar v3 REST API directly (no server proxy), and imports them into the `events` collection with `syncSource: 'google'`. Access tokens are not persisted — the user must reconnect each session.

### PWA

`vite-plugin-pwa` is configured in `vite.config.ts` with `autoUpdate` service worker, full asset precaching, and a Google Fonts `CacheFirst` runtime cache. The manifest is set to Hebrew RTL.
