# StudyFlow Web App Development Plan

## Project Overview
Creating a **single clean web app** (no monorepo, no internal @studyflow packages, no dist builds) for "StudyFlow" per PRD requirements.

**Tech Stack**: React + TypeScript + TailwindCSS + React Router + Zustand; Framer Motion for micro-animations. Firebase (Auth/Firestore/Storage) stubbed/mocked locally first, env keys via `import.meta.env.*`. Storybook for UI. Vitest for unit tests. Vite as bundler (ESM, tree-shaking, code-splitting).

**UX Requirements**: 
- Persistent GALIBOT chat present on every page: tiny floating popover that can expand to ~3/4 page; context-aware by route
- RTL + i18n (he/en)
- Student dashboard shows half schedule, half progress/analytics with color states (green/amber/red) and CTA to review weak topics
- Teacher has 3 tabs: Course Builder, Materials Upload, Assignments/Analytics
- Global design: soft rounded buttons, gentle shadows, accessible contrast (cloud gray, blue, orange, soft green)

**MVP Scope**: login, single course, basic chat, one assignment + feedback, weekly plan, simple progress report

## שלבי עבודה מומלצים (לפי סדר)

### שלב 1: הקמת התשתית (Bootstrap & Setup) - **השלב הקריטי והמיידי**
זהו הבסיס של כל הפרויקט. אי אפשר להתקדם בלעדיו.
1.  **התקנת כל התלויות החסרות:**
    *   **תלויות ליבה:** `react-router-dom`, `zustand`, `framer-motion`, `clsx`, `i18next`, `react-i18next`.
    *   **תלויות פיתוח:** `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`.
2.  **הגדרת Tailwind CSS:**
    *   יצירת קובץ הגדרות (`tailwind.config.ts`).
    *   הגדרת צבעי המותג וה-Theme לפי המפרט (כחול, כתום, ירוק, אפור).
    *   הוספת תמיכה ב-RTL.
3.  **הגדרת כלי פיתוח:**
    *   הרצת פקודות ה-init של Storybook ו-Vitest ליצירת קבצי התצורה.
4.  **ניקוי קבצי דמו:**
    *   מחיקת קבצי ברירת המחדל של Vite (`App.tsx`, `App.css`) כדי להתחיל מדף נקי.

---

### שלב 2: בניית שלד האפליקציה (Project Layout & Skeleton)
לאחר שהתשתית מוכנה, נבנה את המבנה הארגוני של הפרויקט.
1.  **יצירת מבנה התיקיות הראשי:**
    *   `src/app` (לוגיקת אפליקציה ראשית, ניתוב).
    *   `src/components` (רכיבי UI לשימוש חוזר).
    *   `src/features` (פיצ'רים מרכזיים: `student`, `teacher`, `lecturer`, `auth`).
    *   `src/services` (שירותי mock ובעתיד API).
    *   `src/store` (ניהול State עם Zustand).
    *   `src/i18n` (קבצי תרגום).
2.  **יצירת קבצי שלד (Placeholder Files):**
    *   `app/routes.tsx`: הגדרת נתיבים ראשיים (`/login`, `/dashboard`, `/teacher`, `/lecturer`).
    *   `app/layout/AppShell.tsx`: המעטפת שתכיל את הניווט, ה-`ChatWidget`, והתוכן המתחלף.
    *   `features/lecturer/LecturerDashboard.tsx` (וכן קבצים לשני הטאבים שלו).
    *   שלדים לשאר הדשבורדים והרכיבים המרכזיים.

---

### שלב 3: פיתוח רכיבי ליבה וניהול State
כאן נתחיל לממש את הלוגיקה המרכזית.
1.  **מימוש Zustand Stores:** יצירת ה-stores לניהול אימות משתמשים, מידע על קורסים, והודעות בצ'אט.
2.  **מימוש שירותי Mock:** יצירת פונקציות שיחזירו מידע סטטי כדי שנוכל לפתח את ה-UI בלי תלות בשרת אמיתי.
3.  **פיתוח ראשוני של רכיבים מרכזיים:**
    *   **ChatWidget:** מימוש המצב המכווץ והמורחב.
    *   **Student Dashboard:** הצגת לוח זמנים והתקדמות עם מידע מה-mock.
    *   **Lecturer Dashboard:** בניית הטאבים, הטבלה, והגרפים עם מידע מה-mock.

---

### שלב 4: עיצוב, בדיקות ותיעוד
השלב האחרון שבו נוסיף את שכבת הגימור ונוודא את איכות הקוד.
1.  **עיצוב (Styling):** החלת העיצובים שהוגדרו עם Tailwind והוספת אנימציות קטנות.
2.  **בדיקות (Testing):** כתיבת בדיקות "עשן" (smoke tests) עם Vitest כדי לוודא שהרכיבים המרכזיים נטענים כראוי.
3.  **תיעוד (Storybook):** יצירת "סיפורים" לרכיבי ה-UI המרכזיים לתיעוד ופיתוח מבודד.
4.  **בינאום (i18n):** חיבור קבצי התרגום לרכיבים.

### Step 1 — Bootstrap ⏳
**Tasks:**
- [ ] Initialize fresh Vite React+TS app: `pnpm create vite@latest . --template react-ts`
- [ ] Install core deps: `pnpm add react-router-dom zustand framer-motion clsx`
- [ ] Install dev deps: `pnpm add -D @types/node vite@latest typescript@latest`
- [ ] Setup Tailwind: `pnpm add -D tailwindcss postcss autoprefixer` + config
- [ ] Configure design tokens: primary blue #1e40af, accent orange #f97316, success green #22c55e, cloud gray #eef2f7
-    *   Setup Storybook: `pnpm dlx storybook@latest init --type react-vite`
- [ ] Setup Testing: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event`
- [ ] Setup i18n: `pnpm add i18next react-i18next` + he/en namespaces + RTL handling

**Verification**: `pnpm dev` → page renders
**Status**: 🔄 In Progress
**Notes**: 

### Step 2 — Project Layout ⏳
**Tasks:**
- [ ] Create folder structure (src/app, components, features, store, services, i18n, styles)
- [ ] Setup routing in `app/routes.tsx`: /login, /dashboard, /teacher, /course/:id, /report
- [ ] Create AppShell.tsx with header, nav, outlet, ChatWidget
- [ ] Create ChatWidget.tsx (floating mini, expandable drawer)
- [ ] Create skeleton components for student/teacher dashboards
- [ ] Setup basic navigation

**Verification**: navigation renders; ChatWidget opens/collapses; mocks return data
**Status**: ⏸️ Pending
**Notes**: 

### Step 3 — State & Mocks ⏳
**Tasks:**
- [ ] Implement Zustand stores: useAuth, useCourse, useChat
- [ ] Create mock services with static seed data
- [ ] Setup student dashboard with schedule (left) + progress (right)
- [ ] Add green/amber/red pill indicators + CTA "Review topic"

**Verification**: student dashboard shows schedule + progress with color indicators
**Status**: ⏸️ Pending
**Notes**: 

### Step 4 — Styling & Tokens ⏳
**Tasks:**
- [ ] Configure Tailwind theme with design tokens
- [ ] Setup RTL utilities: ensure `dir="rtl"` on `<html>` when locale=he
- [ ] Add Framer Motion transitions for panel mount/expand
- [ ] Style buttons: rounded-xl, soft shadow, focus rings, accessible text sizes

**Verification**: Visual check of styling and RTL support
**Status**: ⏸️ Pending
**Notes**: 

### Step 5 — Storybook ⏳
**Tasks:**
- [ ] Create stories for Button, Card, ProgressBar, ChatWidget
- [ ] Add Storybook docs page explaining color tokens & RTL toggle
- [ ] Remove scaffold stories from init

**Verification**: `pnpm storybook` runs and shows component stories
**Status**: ⏸️ Pending
**Notes**: 

### Step 6 — Testing ⏳
**Tasks:**
- [ ] Vitest smoke tests: StudentDashboard renders schedule & progress
- [ ] ChatWidget toggles and tags messages with current route
- [ ] Add `pnpm test` script and ensure tests pass

**Verification**: All tests green
**Status**: ⏸️ Pending
**Notes**: 

### Step 7 — Env & Future Firebase ⏳
**Tasks:**
- [ ] Create `.env.example` with Firebase placeholder keys
- [ ] Add typed `src/env.ts` using `import.meta.env` (no `process.env`)
- [ ] Keep services under `services/api/` abstract for mock → Firebase swap later

**Verification**: Builds with empty/placeholder env
**Status**: ⏸️ Pending
**Notes**: 

### Step 8 — Quality & Cleanup ⏳
**Tasks:**
- [ ] ESLint + Prettier configs
- [ ] Add `"type": "module"` in package.json
- [ ] Ensure Vite uses ESM, code-split by route (`React.lazy`) for `/teacher` and `/report`
- [ ] Update README with run scripts, conventions
- [ ] Remove leftover demo/test files

**Verification**: Clean build, proper code splitting, updated documentation
**Status**: ⏸️ Pending
**Notes**: 

## Cleanup Checklist Rules
After each step, remove:
- [ ] Vite demo assets (after Step 1)
- [ ] Placeholder components left by Vite/Storybook (after Step 2)
- [ ] Obsolete mock files if replaced (after Step 3)
- [ ] Scaffold stories from init (after Step 5)
- [ ] Any leftover demo/test files not needed (after Step 8)

## Coverage reminders (backend)
- After completing Planner (Phase A), review coverage report artifact and consider raising thresholds by +5%.
- After completing Analytics (Basics), review again and raise by an additional +5% if stable.
- When coverage stabilizes, switch the non-blocking coverage job in CI to blocking and enforce thresholds in Vitest.

## Final Deliverables
- [ ] Running dev server on :3000 with described UI + chat widget
- [ ] `docs/PLAN.md` checked with all steps + "Verification ✅" notes
- [ ] Clean repository with Storybook, tests, and env example
- [ ] Everything in one app (no monorepo, no internal packages)
