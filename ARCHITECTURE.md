# Architecture

This is a **Vite + React web app**.

## Live Code Location

**`src/`** is the live application. All active components, screens, hooks, and logic live here.

## What NOT to Edit

The following directories contain unused/deprecated code and should **NOT** be edited for web features:

- **`app/`** - Next.js app router structure (not used)
- **`deprecated/`** - Moved legacy files including:
  - Next.js pages (`app/(main)/professional/page.tsx`, etc.)
  - React Native screens (`ArtistProfileScreen.tsx`)
  - Duplicate components (`booking-screen.tsx`)

## Tech Stack

- **Framework:** Vite + React (TypeScript)
- **Routing:** React Router (not Next.js routing)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** Zustand (globalStore)

## Key Directories

```
src/
├── components/     # Reusable UI components
├── screens/        # Full-page screen components
├── hooks/          # Custom React hooks
├── lib/            # Utilities, Supabase client, store
├── contexts/       # React contexts
└── types/          # TypeScript type definitions
```

## Rule of Thumb

If you're implementing a new web feature, it goes in `src/`. Never add new features to `app/` or `deprecated/`.
