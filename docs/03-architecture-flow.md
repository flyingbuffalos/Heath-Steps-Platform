# Architecture & Data Flows

## 1. Authentication & Cloud Sync Bootstrap

```mermaid
sequenceDiagram
    actor User
    participant App as App.tsx
    participant Auth as Firebase Auth
    participant Svc as firestoreSteps.ts
    participant Rules as firestore.rules
    participant DB as Firestore DB

    User->>App: Opens StridePulse
    App->>Auth: onAuthStateChanged()
    alt Not Signed In
        App-->>User: Render AuthView (Google Sign-In)
        User->>App: Click "Continue with Google"
        App->>Auth: signInWithPopup(googleProvider)
        Auth-->>App: UserCredential (uid, email_verified: true)
    end

    App->>Svc: ensureUserProfile(user)
    Svc->>DB: getDoc(/users/{uid})
    alt First Login
        Svc->>DB: setDoc(/users/{uid}, defaultProfile + serverTimestamp)
        DB->>Rules: Validate isValidUser + request.time
        Rules-->>DB: Allow
    end
    DB-->>App: UserProfile

    par Real-Time Subscriptions
        App->>DB: onSnapshot(/users/{uid})
        App->>DB: onSnapshot(/users/{uid}/dailySteps where uid==uid)
        App->>DB: onSnapshot(/users/{uid}/stepSessions where uid==uid)
    end
    DB-->>App: Live state streamed to SummaryView & TrendsView
```

---

## 2. Live Pedometer Capture & Atomic Write Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as SensorView
    participant Hook as useStepSensor
    participant OS as iOS / Android Motion API
    participant Svc as firestoreSteps.ts
    participant DB as Firestore (writeBatch)

    User->>UI: Tap "Start Motion Pedometer"
    UI->>Hook: startSensor()
    alt iOS Safari (requestPermission present)
        Hook->>OS: DeviceMotionEvent.requestPermission()
        OS-->>Hook: "granted"
    end
    Hook->>OS: window.addEventListener("devicemotion")
    Hook->>OS: navigator.wakeLock.request("screen")

    loop ~50-60Hz Motion Events
        OS-->>Hook: acceleration / accelerationIncludingGravity
        Hook->>Hook: Low-pass gravity filter -> Magnitude -> Peak -> 3-step gait buffer
        Hook-->>UI: Update sessionSteps, cadenceSpm, liveMagnitude
    end

    User->>UI: Tap "Save Steps"
    UI->>Svc: addStepsToDay(uid, profile, dateKey, hourIndex, steps, ...)
    Svc->>DB: getDoc(/users/{uid}/dailySteps/{dateKey})
    Svc->>DB: writeBatch().commit()
    Note over Svc,DB: Atomically updates dailySteps/{dateKey} (total + hourlySteps[hour])<br/>AND creates immutable stepSessions/{sessionId}
    DB-->>UI: onSnapshot pushes updated ring & hourly chart
```

---

## 3. Apple Health XML / CSV Import & CSV Export Flow

```mermaid
flowchart LR
    File["User Uploads File\n(Apple Health export.xml or CSV)"] --> Parse["parseHealthImportFile()\nsrc/lib/healthCalculations.ts"]
    Parse --> FilterXml{"XML or CSV?"}
    FilterXml -- "XML (<Record type=HKQuantityTypeIdentifierStepCount>)" --> BucketHourly["Aggregate into YYYY-MM-DD\n& exact 24h hour buckets"]
    FilterXml -- "CSV (date, steps)" --> BucketDaytime["Aggregate into YYYY-MM-DD\n& distribute across 8am–6pm"]
    BucketHourly --> Sync["importDailyStepRecords()\n(Up to 90 most recent days)"]
    BucketDaytime --> Sync
    Sync --> Firestore[("Firestore\n/users/{uid}/dailySteps/{dateKey}")]

    Firestore --> Export["exportDailyRecordsToCsv()\nDownloads stridepulse-steps-YYYY-MM-DD.csv"]
```

---

## 4. Cross-Platform PWA Installability & Offline Flow

```mermaid
flowchart TD
    Boot["App Loads in Browser"] --> SW["Workbox Service Worker Registered\n(Precaches JS, CSS, HTML, Icons & Google Fonts)"]
    Boot --> Platform{"Detect Platform"}

    Platform -- "Already Standalone" --> HideBtn["Hide Install Prompts"]
    Platform -- "Android / Chrome Desktop\n(beforeinstallprompt fired)" --> NativePrompt["PWAInstallButton triggers\ndeferredPrompt.prompt()"]
    Platform -- "iOS Safari" --> IOSGuide["PWAInstallButton opens modal:\nShare -> Add to Home Screen"]

    SW --> NetCheck{"navigator.onLine?"}
    NetCheck -- "false" --> Banner["OfflineIndicator renders\n'Offline Mode — Changes sync when reconnected'"]
    NetCheck -- "true" --> Synced["Firestore client syncs queued writes automatically"]
```
