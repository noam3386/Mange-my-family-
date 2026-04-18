# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # TypeScript check + production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

No testing framework is configured. To add one, Vitest is recommended (native Vite integration).

## Architecture

**React 19 + TypeScript PWA** for Hebrew-speaking families. Firebase is the only backend.

### Data Flow

1. **Firebase** (`src/lib/firebase.ts`) — initializes Auth, Firestore, and Cloud Messaging using `VITE_FIREBASE_*` env vars.
2. **`useAuth` hook** (`src/hooks/useAuth.ts`) — subscribes to Firebase auth state, loads the user's profile and family doc from Firestore, writes to Zustand store.
3. **`useRealtimeData` hook** (`src/hooks/useRealtimeData.ts`) — sets up `onSnapshot` listeners for shopping items, tasks, events, family members, and announcements; updates Zustand store on changes.
4. **Zustand store** (`src/store/index.ts`) — single store holding auth state, all data arrays, and UI state (active tab).
5. **Pages** read from the store and call Firestore functions directly from `src/lib/firestore.ts`.

### Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Root with routing and auth-gated redirects |
| `src/store/index.ts` | Global state (auth + all domain data) |
| `src/types/index.ts` | All TypeScript interfaces (`Family`, `FamilyMember`, `ShoppingItem`, `Task`, `CalendarEvent`, etc.) |
| `src/lib/firestore.ts` | All Firestore read/write operations |
| `src/lib/googleCalendar.ts` | Google Calendar API integration |
| `src/components/layout/MainLayout.tsx` | Shell with sticky header + bottom tab navigation |

### Pages

- `src/pages/auth/` — Login, Register, Google OAuth, JoinFamily, SetupFamily
- `src/pages/shopping/` — Shopping list with swipe-to-purchase and approval workflow
- `src/pages/tasks/` — Chore management with points, recurrence, board/list/daily views
- `src/pages/calendar/` — Calendar with Google Calendar sync
- `src/pages/family/` — Member profiles, announcements, invite codes, settings

### Styling & i18n

- **Tailwind CSS** with custom colors (`primary` = sky blue, named family member colors) and `Heebo` font for RTL.
- **i18next** with Hebrew (default, RTL) and English. Translations in `src/i18n/he.json` and `src/i18n/en.json`. Language toggle adjusts `dir` attribute.

### Firebase / Environment

Required `.env` variables (see `.env.example`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Firestore security rules are in `firestore.rules`. Data is scoped by `familyId` — users can only access documents within their family. Deploy rules with `firebase deploy --only firestore:rules`.

### Path Alias

`@/` maps to `src/` — use `@/components/...`, `@/lib/...`, etc. everywhere.
