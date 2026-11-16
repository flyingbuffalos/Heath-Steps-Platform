# StridePulse

**StridePulse** is an Apple Health-inspired, cross-platform step counter and activity history application built for **Android, iOS, and Desktop Web**. It combines a hardware accelerometer pedometer (`DeviceMotionEvent`), anthropometric stride and calorie modeling, interactive multi-range trend analytics (`D / W / M / 6M / Y`), Apple Health XML/CSV interoperability, and private cloud persistence via Firebase Authentication and Cloud Firestore.

---

## Core Capabilities

- **Apple Health-Style Step & Energy Calculation**
  - **3-Stage Motion Pedometer**: Isolates linear acceleration using a low-pass gravity filter ($\alpha = 0.85$), detects gait peaks dynamically, and applies a rhythmic cadence buffer (41–187 spm) to eliminate pocket jitter.
  - **Cross-Platform Sensor Support**: Supports iOS Safari (`DeviceMotionEvent.requestPermission()`), Android Chrome hardware motion sensors, and a built-in **Walk Test** simulator for desktop calibration.
  - **Biometric Calibration**: Computes stride length from height ($0.415 \times \text{height}_{\text{cm}}$ with brisk-cadence scaling), distance (`km` / `mi`), active calories (Ainsworth MET model by body weight and cadence), move minutes, and estimated flights climbed.
- **Persistent Cloud History & Security**
  - **Google Authentication**: Private per-user sign-in powered by Firebase Auth.
  - **Real-Time Firestore Sync**: Stores user calibration profiles, daily aggregated step records with 24-hour hourly buckets, and individual walk/sensor session logs.
  - **Zero-Trust Security Rules**: Schema-validated, owner-isolated rules in `firestore.rules` verified with `@firebase/eslint-plugin-security-rules`.
- **Android & iOS Installability (PWA)**
  - Configured with `vite-plugin-pwa`, standalone Web App Manifest, Workbox offline caching, Android maskable icons, iOS `apple-touch-icon.png`, safe-area viewport insets, and an in-app install guide.
- **Apple Health & CSV Interoperability**
  - Import historical `HKQuantityTypeIdentifierStepCount` records directly from Apple Health `export.xml` or `.csv` files, and export your full archive to `.csv`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI Framework** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Build & PWA** | Vite 8, `vite-plugin-pwa` (Workbox) |
| **Auth & Database** | Firebase Auth (Google), Cloud Firestore (Named DB) |
| **Security Linting** | ESLint + `@firebase/eslint-plugin-security-rules` |

---

## Project Structure

```text
├── docs/                              # Architecture, flow, usage, ADRs, and engineering skills
│   ├── 01-high-level-architecture.md
│   ├── 02-low-level-design.md
│   ├── 03-architecture-flow.md
│   ├── 04-how-to-use.md
│   ├── 05-infra-and-tech-choices.md
│   └── 06-SKILLS-AND-STANDARDS.md
├── public/                            # PWA icons (192, 512, maskable, 180 apple-touch-icon, SVG)
├── src/
│   ├── components/                    # AuthView, SummaryView, TrendsView, SensorView, ProfileView, charts & modals
│   ├── hooks/                         # useStepSensor, usePWAInstall, useOnlineStatus
│   ├── lib/                           # firebase.ts, healthCalculations.ts
│   ├── services/                      # firestoreSteps.ts (real-time listeners & batch ledger writes)
│   ├── types/                         # health.ts (domain types & blueprint validation constants)
│   ├── App.tsx                        # Root application shell, auth gating, and responsive nav
│   ├── index.css                      # Tailwind v4 setup, @custom-variant dark, safe-area utilities
│   └── main.tsx                       # Entry point
├── firebase-applet-config.json        # Firebase project & named Firestore database config
├── firebase-blueprint.json            # Canonical entity & collection blueprint IR
├── firestore.rules                    # Hardened Firestore security rules
├── security_spec.md                   # Data invariants & adversarial test specification
├── eslint.config.mjs                  # ESLint config for Firestore security rules
├── vite.config.ts                     # Vite + VitePWA configuration
└── package.json
```

---

## Local Development & Verification

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
Runs on port `3000` with PWA service worker support enabled:
```bash
npm run dev
```

### 3. Type-Check, Build, and Lint Security Rules
```bash
npm run lint                 # TypeScript check (tsc --noEmit)
npm run build                # Production Vite + PWA bundle
npx eslint firestore.rules   # Validate Firestore security rules
```

---

## Documentation Index

| Document | Purpose |
| :--- | :--- |
| [High-Level Architecture](docs/01-high-level-architecture.md) | System boundaries, cross-platform runtime model, and multi-tenant isolation |
| [Low-Level Design](docs/02-low-level-design.md) | Module contracts, pedometer signal math, calorie formulas, and Firestore schema |
| [Architecture Flow](docs/03-architecture-flow.md) | Sequence & data flow diagrams for Auth, live sensor sync, import/export, and PWA |
| [How to Use](docs/04-how-to-use.md) | User guide for iOS, Android, Desktop, Apple Health XML import, and troubleshooting |
| [Infrastructure & Tech Choices](docs/05-infra-and-tech-choices.md) | Architectural Decision Records (ADRs) explaining what stack options were chosen and why |
| [Engineering Skills & Standards](docs/06-SKILLS-AND-STANDARDS.md) | Mandatory rules & checklists for Firebase, UI/UX, and PWA alignment on future changes |
