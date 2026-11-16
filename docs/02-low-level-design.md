# Low-Level Design (LLD)

## 1. Module Directory & Responsibilities

| File | Responsibility |
| :--- | :--- |
| `src/types/health.ts` | Core TypeScript interfaces (`UserProfile`, `DailyStepRecord`, `StepSession`) and `BLUEPRINT_LIMITS` validation constants synchronized with `firebase-blueprint.json`. |
| `src/lib/firebase.ts` | Initializes Firebase App from `firebase-applet-config.json`, binds Firestore to `firebaseConfig.firestoreDatabaseId`, configures Google Auth (`GoogleAuthProvider`), executes `getDocFromServer` connection test, and exposes `handleFirestoreError`. |
| `src/lib/healthCalculations.ts` | Implements stride estimation, distance formatting, Ainsworth MET calorie formula, active minute calculation, streak computation, Apple Health XML / CSV parsing, and CSV export. |
| `src/hooks/useStepSensor.ts` | Implements the 3-stage `DeviceMotionEvent` accelerometer pedometer, iOS permission prompt, Walk Test desktop simulator, and Screen Wake Lock management. |
| `src/hooks/usePWAInstall.ts` | Captures `beforeinstallprompt` on Android/Chrome, detects `standalone` mode, and detects iOS Safari devices. |
| `src/hooks/useOnlineStatus.ts` | Subscribes to browser `online` and `offline` events. |
| `src/services/firestoreSteps.ts` | Handles `ensureUserProfile`, `updateUserProfileSettings`, real-time `onSnapshot` subscriptions, atomic `writeBatch` step additions (`addStepsToDay`), bulk imports (`importDailyStepRecords`), and session deletion (`deleteStepSession`). |

---

## 2. Pedometer Signal Processing Pipeline (`useStepSensor.ts`)

Mobile accelerometers report raw acceleration including Earth's gravity ($\approx 9.81\text{ m/s}^2$) across three axes $(a_x, a_y, a_z)$. StridePulse models Apple CoreMotion's `CMPedometer` approach in three stages:

### Stage 1: Gravity Isolation (Low-Pass Filter)
When `event.acceleration` (hardware-separated linear acceleration) is unavailable and only `accelerationIncludingGravity` is provided, a first-order low-pass filter ($\alpha = 0.85$) isolates the slowly changing gravity vector $\mathbf{g}$:

$$g_t = \alpha \cdot g_{t-1} + (1 - \alpha) \cdot a_t$$
$$a_{\text{linear}, t} = a_t - g_t$$

The linear magnitude is smoothed with an exponential moving average ($0.45 \cdot m_{t-1} + 0.55 \cdot \|\mathbf{a}_{\text{linear}, t}\|$) to dampen high-frequency sensor noise.

### Stage 2: Adaptive Peak Detection
Over a sliding window of the last 45 samples ($\approx 0.75\text{ s}$–$1.0\text{ s}$), the detector computes the rolling mean $\bar{m}$ and sets a dynamic peak threshold:

$$\text{Threshold} = \max(1.35,\ 1.45 \cdot \bar{m})$$

A peak candidate is confirmed when the smoothed signal rises above `Threshold` and subsequently drops below $80\%$ of its local peak height.

### Stage 3: Gait Bandpass & 3-Step Cadence Validation Buffer
- **Inter-Step Interval Filter**: Peaks closer than `320 ms` ($> 187\text{ spm}$) are ignored as bounce/vibration; gaps $> 2200\text{ ms}$ reset the active walking streak.
- **Rhythmic Commit Buffer**: Just like iOS CoreMotion, isolated 1–2 jolts do not immediately increment the counter. On the **3rd consecutive rhythmic step**, all 3 buffered steps commit together, and subsequent steps commit in real time while computing live cadence (`spm`) from the rolling 8-step interval average.

---

## 3. Biometric & Apple Health Formulas (`healthCalculations.ts`)

### Stride Length Calibration (`calculateDefaultStrideCm`)
- **Walking Baseline**: $\text{stride}_{\text{cm}} = \text{round}(0.415 \times \text{height}_{\text{cm}})$ (clamped to `[30, 150] cm`).
- **Dynamic Cadence Scaling**: When cadence exceeds `120 spm` (brisk walk to run), an incremental boost up to `+0.20 × height` is applied smoothly.

### Distance (`calculateDistanceMeters`)
$$\text{distance}_{\text{meters}} = \text{round}\left(\frac{\text{steps} \times \text{strideLengthCm}}{100}\right)$$

### Active Calories (`calculateActiveCalories`)
Uses a weight-normalized and cadence-scaled Ainsworth MET approximation:

$$\text{intensity} = \begin{cases} 1.45 & \text{cadence} \ge 140\text{ spm (running)} \\ 1.18 & 115 \le \text{cadence} < 140\text{ spm (brisk walk)} \\ 1.00 & \text{cadence} < 115\text{ spm (standard walk)} \end{cases}$$

$$\text{kcal} = \text{round}\left(\text{steps} \times 0.04 \times \frac{\text{weight}_{\text{kg}}}{70} \times \text{intensity}\right)$$

### Active Minutes & Flights Equivalent
- **Move Time**: $\max(1, \text{round}(\text{steps} / \text{clamp}(\text{cadence}, 60, 200)))$
- **Estimated Flights**: $\lfloor \text{steps} / 2200 \rfloor$ (when barometric altimeter data is unavailable in web browsers).

---

## 4. Firestore Schema & Data Contract

Schemas are formally declared in `/firebase-blueprint.json` and mirrored verbatim in `/firestore.rules` and `BLUEPRINT_LIMITS` (`src/types/health.ts`).

### Collection 1: `/users/{userId}`
| Field | Type | Constraints | Mutability |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | `1..128` chars, `^[a-zA-Z0-9_-]+$`, `== auth.uid` | Immutable |
| `displayName` | `string` | `1..80` chars | Mutable |
| `email` | `string` | `3..160` chars | Immutable |
| `photoURL` | `string` (opt) | `0..500` chars | Mutable |
| `dailyGoal` | `number` | `1000..100000` | Mutable |
| `heightCm` | `number` | `100..250` | Mutable |
| `weightKg` | `number` | `30..250` | Mutable |
| `strideLengthCm` | `number` | `30..150` | Mutable |
| `unitSystem` | `string` | `'metric' \| 'imperial'` | Mutable |
| `createdAt` | `timestamp` | Must equal `request.time` on create | Immutable |
| `updatedAt` | `timestamp` | Must equal `request.time` on write | Mutable |

### Collection 2: `/users/{userId}/dailySteps/{dateKey}`
- Document ID `{dateKey}` must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` and equal `data.date`.
- `hourlySteps`: `number[]` of fixed length `24` (indices `0..23` representing local hours `00:00`–`23:59`).
- `source`: `'sensor' | 'manual' | 'import' | 'hybrid'`.
- Bounds: `steps <= 250000`, `distanceMeters <= 300000`, `calories <= 20000`, `activeMinutes <= 1440`, `flightsClimbed <= 500`.

### Collection 3: `/users/{userId}/stepSessions/{sessionId}`
- `allow update: if false;` — sessions are immutable audit entries (create or delete only).
- `source`: `'pedometer' | 'manual' | 'apple_health_import'`.
- `note`: `string` (`0..140` chars).

---

## 5. Error Handling Contract (`src/lib/firebase.ts`)

Every Firestore `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch.commit`, and `onSnapshot` error callback invokes `handleFirestoreError(error, operationType, path)`. This serializes a structured `FirestoreErrorInfo` JSON payload containing `operationType`, `path`, and non-secret `authInfo` metadata before rethrowing, making permission or validation failures immediately diagnosable.
