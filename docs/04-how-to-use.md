# How to Use StridePulse

StridePulse works on **iPhone/iPad (iOS)**, **Android**, and **Desktop browsers**, syncing your step history automatically to your Google account.

---

## 1. Sign In & Initial Calibration

1. Open the app URL in Safari (iOS), Chrome (Android), or any desktop browser.
2. Tap **Continue with Google** and sign in with your Google account.
3. Open the **Profile** tab to personalize your Apple Health calibration:
   - **Daily Step Goal** (default: `10,000` steps)
   - **Height (cm)** and **Weight (kg)**
   - **Stride Length (cm)** — tap **Auto-calc** to compute the standard anthropometric walking stride (`0.415 × height`) or enter your custom measured stride.
   - **Distance Unit** — choose **Metric (km)** or **Imperial (mi)**.
   - **Theme** — switch between Light Mode and Dark Mode.
4. Tap **Save Calibration**.

---

## 2. Installing as a Native-Style App (iOS & Android)

Installing StridePulse adds its icon to your home screen, launches without browser address bars, and caches assets for offline access.

### On iPhone & iPad (iOS Safari)
1. Open StridePulse in **Safari**.
2. Tap **Add to iPhone** in the header (or go to **Profile → Install on iPhone / iPad** for instructions), or directly tap the **Share** icon in Safari's bottom toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Launch **StridePulse** from your home screen.

### On Android (Chrome / Edge)
1. Open StridePulse in **Chrome**.
2. Tap **Install App** in the header or inside **Profile → Install StridePulse App**, and confirm **Install**.
3. StridePulse will install to your app drawer and home screen as a standalone app.

---

## 3. Tracking Steps

### Method A: Live Motion Pedometer (iOS & Android Phones)
1. Navigate to the **Pedometer** tab.
2. Tap **Start Motion Pedometer**.
   - **On iOS**: Safari will display a native system dialog asking for **Motion & Orientation Access**. Tap **Allow**.
   - **On Android**: Accelerometer tracking starts immediately.
3. Walk naturally with your phone in your pocket or hand. Notice that the pedometer validates **3 rhythmic steps** before committing to prevent false counts from sudden bumps, then updates your live step count, cadence (`spm`), distance, and active calories.
4. When finished, tap **Pause Sensor**, optionally edit the session note (e.g., `"Morning Commute"`), and tap **Save X Steps** to commit the session to today's step ring and cloud history.

> **Browser Note**: Because web PWAs do not run background OS daemons when the browser is fully closed/screen-locked by iOS/Android power management, keep the Pedometer tab active while recording a dedicated live walk (StridePulse automatically requests a Screen Wake Lock while tracking).

### Method B: Walk Test Simulator (Desktop Browsers)
On laptops or desktops without accelerometer hardware, click **Walk Test (Desktop)** on the **Pedometer** tab to simulate a 114 spm walk and test session saving and chart updates.

### Method C: Manual Walk Logging
1. Tap **Log Walk** in the top header (or **Log Steps** on the Summary card).
2. Choose a quick preset (`+1,000`, `+2,500`, `+5,000`) or enter an exact step count, duration, date, and activity label.
3. Review the real-time **Est. Distance**, **Active Energy**, and **Cadence** preview, then tap **Add Steps**.

---

## 4. Importing & Exporting Apple Health History

You can bring your existing iPhone step history into StridePulse or back up your records anytime:

1. **Export from Apple Health (iOS)**:
   - Open the **Health** app on iPhone → tap your profile picture → **Export All Health Data** → unzip `export.zip` to get `export.xml`.
2. **Import into StridePulse**:
   - Open the **Trends** tab → tap **Import Apple Health / CSV** → select `export.xml` (or a CSV formatted as `YYYY-MM-DD,steps`).
   - StridePulse parses `HKQuantityTypeIdentifierStepCount` records into daily totals and 24-hour hourly distributions and stores up to the 90 most recent days into your cloud archive.
3. **Export Backup CSV**:
   - On the **Trends** tab, tap **Export CSV** to download `stridepulse-steps-YYYY-MM-DD.csv`.

---

## 5. Inspecting Trends & Deleting Entries

- **Summary Tab**: Use the 7-day horizontal date strip at the top to switch days, inspect the 24-hour hourly bar chart (tap/hover any bar for exact counts), and delete any erroneous session entry via the trash icon.
- **Trends Tab**: Switch between **D** (Day), **W** (Week), **M** (Month), **6M** (6 Months), and **Y** (Year) views, inspect your goal streak and personal best, or tap any day in the **Daily Step Archive** to jump directly to that day's Summary.
