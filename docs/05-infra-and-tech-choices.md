# Infrastructure & Technology Choices (ADRs)

This document records the architectural and infrastructure options selected for **StridePulse**, why each option was chosen, what alternatives were evaluated, and the resulting trade-offs.

---

## ADR-01: Installable Progressive Web App (React + Vite + `vite-plugin-pwa`) vs. Native Swift/Kotlin or React Native

- **Chosen Option**: Single-codebase **Progressive Web App (PWA)** built with React 19, TypeScript, Vite 8, and `vite-plugin-pwa` (Workbox).
- **Why**:
  - **Simultaneous Android, iOS & Desktop Compatibility**: A single codebase runs immediately via URL and installs cleanly onto both Android home screens (`beforeinstallprompt` + maskable icon) and iOS home screens (`apple-mobile-web-app-capable` + `180×180` PNG `apple-touch-icon`), with zero app store review delays.
  - **Offline Resilience**: Workbox precaches the UI shell, icons, and Google Fonts so the app boots instantly even on spotty cellular connections.
  - **Unified Hosting**: Served cleanly from one web deployment without maintaining separate Xcode (`.ipa`) and Android Studio (`.apk`) release pipelines.
- **Alternatives Considered**:
  - *Separate Native iOS (Swift/HealthKit) + Android (Kotlin/Health Connect)*: Unlocks background OS step-daemon access when the app is closed, at the cost of 2×–3× codebases, macOS/Xcode build requirements, and App Store/Play Store distribution overhead.
  - *React Native / Expo*: Cross-platform mobile, but loses instant zero-install browser preview and requires native wrapper builds.
- **Trade-Off & Mitigation**: Web browsers suspend `DeviceMotionEvent` when fully backgrounded or screen-locked. StridePulse mitigates this with `navigator.wakeLock` during active sessions, manual walk logging, and direct **Apple Health `export.xml` / CSV import** so users can merge native OS step logs anytime.

---

## ADR-02: Firebase Authentication + Cloud Firestore (`ai-studio-b26d1afb-cb7a-4c8f-bb9e-685643bac006`) vs. Custom REST API + SQL Database

- **Chosen Option**: **Firebase Authentication (Google OAuth)** paired with **Cloud Firestore** (Enterprise Edition named database `ai-studio-b26d1afb-cb7a-4c8f-bb9e-685643bac006`).
- **Why**:
  - **Real-Time Multi-Device Sync**: Firestore's `onSnapshot` listeners push step updates immediately across a user's phone and desktop browser without polling or writing custom WebSocket infrastructure.
  - **Offline-First Client Persistence**: Firestore SDK buffers offline mutations and automatically reconciles them when connectivity returns, matching our PWA offline indicator.
  - **Zero-Ops Authentication**: Google Sign-In (`signInWithPopup`) provides verified user identities (`email_verified: true`) without building password hashing, reset flows, or session token servers.
  - **Document Shape Fit**: Each day's step record (`dailySteps/{YYYY-MM-DD}`) naturally embeds its fixed 24-element `hourlySteps` array alongside daily KPIs in a single document read.
- **Alternatives Considered**:
  - *Express Backend + PostgreSQL (Cloud SQL)*: Better for complex cross-user SQL joins and analytics, but unnecessary here because step records are strictly single-user partitioned (`users/{uid}`) and benefit more from real-time client snapshots and zero backend server maintenance.
  - *Browser `localStorage` / IndexedDB only*: Fails the requirement to preserve history securely across devices and logins.

---

## ADR-03: Pre-Aggregated `dailySteps/{dateKey}` + Immutable `stepSessions/{sessionId}` vs. Raw Event-Sourcing

- **Chosen Option**: Hybrid **2-collection subcollection model** under `/users/{userId}`:
  - `dailySteps/{YYYY-MM-DD}` stores the aggregated day total, distance, calories, and 24-hour bucket array.
  - `stepSessions/{sessionId}` stores individual walks, live pedometer sessions, and imports as append-only/deletable audit logs.
- **Why**:
  - **Read Cost & Chart Speed**: Displaying 7-day, 30-day, 6-month, or 1-year charts requires at most 365 lightweight document reads instead of aggregating thousands of individual session documents on the client.
  - **Atomic Consistency**: `addStepsToDay` updates `dailySteps/{dateKey}` and inserts `stepSessions/{sessionId}` inside a single Firestore `writeBatch()`, preventing drift between the daily ring and session history.
  - **Safe Undo**: Deleting a mistakenly logged session in `SummaryView` deterministically subtracts its steps and proportionally adjusts the parent `dailySteps` metrics.

---

## ADR-04: Browser `DeviceMotionEvent` 3-Stage Signal Pipeline vs. Raw Acceleration Thresholding

- **Chosen Option**: **Gravity low-pass filter ($\alpha = 0.85$) + adaptive peak detector + 3-step gait cadence buffer (`320–1450 ms`)**.
- **Why**:
  - Naive thresholding on `accelerationIncludingGravity` falsely counts steps whenever a user picks up or tilts their phone because gravity alone contributes $9.81\text{ m/s}^2$.
  - Requiring 3 rhythmic steps within valid human gait cadence mirrors Apple CoreMotion's `CMPedometer` anti-jitter behavior while working across both `DeviceMotionEvent.requestPermission()` (iOS 13+ Safari) and Android Chrome.

---

## ADR-05: Zero-Trust `firestore.rules` + `@firebase/eslint-plugin-security-rules` vs. Basic `request.auth != null` Rules

- **Chosen Option**: Strict **Attribute-Based Access Control (ABAC)** & schema enforcement in `firestore.rules`, validated via ESLint (`eslint.config.mjs`) and documented in `firebase-blueprint.json` and `security_spec.md`.
- **Why**:
  - Because the client writes directly to Firestore, security rules are the primary security boundary.
  - Enforcing `request.auth.token.email_verified == true`, `isOwner(userId)`, `hasAll`/`hasOnly` field allowlists, `affectedKeys().hasOnly(...)` on updates, `request.time` server timestamps, `hourlySteps.size() == 24`, and strict numeric bounds prevents shadow-field injection, PII leaks, and timestamp spoofing.

---

## ADR-06: Tailwind CSS v4 + Custom SVG Visualizations vs. Heavy Chart/UI Libraries

- **Chosen Option**: **Tailwind CSS v4** (`@tailwindcss/vite`) with bespoke SVG `StepRing` and `StepCharts` components.
- **Why**:
  - Zero-runtime CSS overhead and compact mobile bundle size for fast PWA loading over mobile networks.
  - Full control over Apple Health-inspired circular rings, tabular numerals (`tabular-nums`), goal reference lines, `D/W/M/6M/Y` bar interactions, and dark/light theme parity (`@custom-variant dark`).
