# Engineering Skills & Alignment Standards

This document defines the mandatory architectural, security, UI/UX, and cross-platform standards for **StridePulse**. Any future contributor or coding assistant modifying this repository must align with these skills and verification checks.

---

## Skill 1: Firebase Integration & Zero-Trust Security Rules

Whenever modifying data models, queries, authentication, or Firestore collections:

1. **Named Database Binding (Critical)**:
   - `src/lib/firebase.ts` must always initialize Firestore with the database ID from `firebase-applet-config.json`:
     ```ts
     export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
     ```
   - Never revert to `getFirestore(app)` without `firestoreDatabaseId`, or reads/writes will target `(default)` instead of `ai-studio-b26d1afb-cb7a-4c8f-bb9e-685643bac006`.

2. **Blueprint-to-Code Synchronicity**:
   - `firebase-blueprint.json` is the canonical schema plan (`UserProfile`, `DailyStepRecord`, `StepSession`).
   - Any new field, enum value, string max length, or numeric bound must be updated simultaneously in:
     1. `firebase-blueprint.json`
     2. `src/types/health.ts` (`BLUEPRINT_LIMITS` + TypeScript interfaces)
     3. `firestore.rules` (`isValidUser`, `isValidDailyStep`, `isValidStepSession`)
     4. `security_spec.md`

3. **Security Rules Guardrails (`firestore.rules`)**:
   - Keep `match /{document=**} { allow read, write: if false; }` as the default-deny root catch-all.
   - Require `request.auth != null && request.auth.token.email_verified == true` and `request.auth.uid == userId` on all user data (no blanket `isSignedIn()` reads).
   - Every `create` must enforce `data.keys().hasAll([...]) && data.keys().hasOnly([...])` and `incoming().createdAt == request.time`.
   - Every `update` must wrap `isValid[Entity]` AND restrict mutable keys with `incoming().diff(existing()).affectedKeys().hasOnly([...])` while protecting immutable keys (`uid`, `date`, `createdAt`).
   - Every `list` rule must filter against `resource.data.uid == request.auth.uid` without calling `get()` or `exists()`.
   - Subcollection writes must verify parent `/users/{userId}` existence via `exists(...)`.
   - **Mandatory Lint Gate**: After *any* edit to `firestore.rules`, run:
     ```bash
     npx eslint firestore.rules
     ```
     and deploy the updated rules to Firebase before shipping.

4. **Mandatory Firestore Error Wrapper**:
   - Every Firestore operation (`getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch.commit`, and `onSnapshot` error callback) must catch errors through `handleFirestoreError(error, OperationType.*, path)` in `src/lib/firebase.ts`.

---

## Skill 2: Frontend Design & Mobile Touch Ergonomics

Whenever adding or modifying views, navigation, or charts:

1. **60-30-10 Color Discipline & Dual-Theme Parity**:
   - **60% Neutral Canvas**: `#F5F5F7` (light) / `#0A0B0E` (dark).
   - **30% Structural Surfaces**: Crisp cards (`#FFFFFF` / `#14161B`) with single-level hairline borders (`border-slate-200/80 dark:border-slate-800`).
   - **10% Accent**: Flame Coral (`#FF5A36`) reserved for primary CTAs, active step rings, and active navigation states.
   - Keep `@custom-variant dark (&:where(.dark, .dark *));` directly beneath `@import "tailwindcss";` in `src/index.css`. Never use CSS `!important` theme inversion overrides.

2. **Typography & Tabular Discipline**:
   - Use `Plus Jakarta Sans` (`font-display`) for headings, `DM Sans` for prose, and `JetBrains Mono` (`font-mono tabular-nums`) for all step counts, distances, calories, cadences, and dates so metrics align cleanly without layout jitter.

3. **Anti-Slop UI Rules**:
   - **Zero-Pill Metadata**: Do not wrap static tags, dates, or counts in pill capsules; render them as clean inline text separated by `·`.
   - **No Decorative Pulsing Dots**: Reserve animated indicator dots strictly for real live states (e.g., when `sensor.isTracking === true` in `SensorView`).
   - **No Thick Left Accent Borders** (`border-l-4`) or nested cards-within-cards.
   - **Top Bar Contract**: Keep the desktop header strictly to 3 zones (`[Brand Wordmark] — [Single-line Nav Links] — [1 Primary Action Button]`).

4. **Mobile Touch & Thumb-Zone Rules (`375px–430px`)**:
   - Maintain a minimum **`44×44px`** touch hitbox on every button, tab, and list action.
   - Keep the mobile Fixed Bottom Tab Bar anchored in the natural thumb reach zone (`pb-safe`), ensuring combined sticky top + bottom chrome remains under **15%** of mobile viewport height.
   - Never trap desktop layouts inside a narrow mobile column; expand cleanly up to `max-w-6xl` multi-column grids on `lg:`.

---

## Skill 3: Cross-Platform PWA & Motion Sensor Alignment

Whenever updating build configuration, icons, or sensor logic:

1. **PWA Manifest & Icon Compliance (`vite.config.ts`, `index.html`, `public/`)**:
   - Preserve `VitePWA` in `vite.config.ts` alongside the `copy-unbundled-src-assets` plugin and `DISABLE_HMR` server settings.
   - Keep `short_name` $\le 12$ characters (`StridePulse`) and `display: 'standalone'`.
   - Always maintain separate `any` (`192×192`, `512×512`) and `maskable` (`512×512` with 10–15% safe-zone padding) PNG icons, plus a PNG `apple-touch-icon.png` (`180×180`) for iOS Safari (iOS does not support SVG touch icons).
   - Keep `PWAInstallButton` and `OfflineIndicator` mounted so users on both Android Chrome and iOS Safari have an install path and offline feedback.

2. **iOS & Android Motion Sensor Rules (`useStepSensor.ts`)**:
   - Always invoke `DeviceMotionEvent.requestPermission()` directly inside a user click handler (`startSensor`) to satisfy iOS Safari's user-gesture requirement.
   - Preserve the low-pass gravity filter and rhythmic cadence validation (`320–1450 ms` step intervals) so pocket jitter does not corrupt step totals.
   - Keep the **Walk Test** desktop simulator functional for testing on hardware without accelerometers.

---

## Pre-Merge Verification Checklist

Before finalizing any code or documentation change, run and verify all three gates:

```bash
npm run lint                 # Zero TypeScript errors (tsc --noEmit)
npm run build                # Successful Vite + Workbox PWA production build
npx eslint firestore.rules   # Zero Firestore security rule warnings/errors
```
