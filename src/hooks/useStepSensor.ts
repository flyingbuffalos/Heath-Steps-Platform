import { useCallback, useEffect, useRef, useState } from 'react';

export type SensorPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export interface StepSensorState {
  isTracking: boolean;
  isSimulating: boolean;
  permission: SensorPermissionState;
  hardwareDetected: boolean;
  sessionSteps: number;
  elapsedSeconds: number;
  cadenceSpm: number;
  liveMagnitude: number;
  lastStepTimestamp: number | null;
  errorMessage: string | null;
}

export function useStepSensor() {
  const [state, setState] = useState<StepSensorState>({
    isTracking: false,
    isSimulating: false,
    permission: 'unknown',
    hardwareDetected: false,
    sessionSteps: 0,
    elapsedSeconds: 0,
    cadenceSpm: 0,
    liveMagnitude: 0,
    lastStepTimestamp: null,
    errorMessage: null,
  });

  // Gravity & adaptive peak detection state
  const gravityRef = useRef({ x: 0, y: 0, z: 9.81 });
  const prevFilteredRef = useRef(0);
  const peakCandidateRef = useRef(0);
  const risingRef = useRef(false);
  const lastPeakTimeRef = useRef(0);
  const cadenceBufferRef = useRef<number[]>([]);
  const validatedStreakRef = useRef(0);
  const recentMagnitudesRef = useRef<number[]>([]);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const hardwareTimeoutRef = useRef<number | null>(null);
  const receivedEventRef = useRef(false);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors when tab is already hidden
      }
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const wl = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        wakeLockRef.current = wl;
      } catch {
        // Non-fatal if browser denies wake lock
      }
    }
  }, []);

  const registerStep = useCallback((now: number) => {
    const stepTimeouts = cadenceBufferRef.current;
    if (lastPeakTimeRef.current > 0) {
      const intervalMs = now - lastPeakTimeRef.current;
      // Valid human gait interval: 320ms (187 spm) to 1450ms (41 spm)
      if (intervalMs < 320) return;
      if (intervalMs > 2200) {
        validatedStreakRef.current = 0;
        cadenceBufferRef.current = [];
      } else {
        stepTimeouts.push(intervalMs);
        if (stepTimeouts.length > 8) stepTimeouts.shift();
      }
    }

    lastPeakTimeRef.current = now;
    validatedStreakRef.current += 1;

    // Like Apple CoreMotion CMPedometer, commit steps once rhythmic cadence is established
    // (or immediately once streak >= 3, crediting the initial buffer steps)
    const commitDelta = validatedStreakRef.current === 3 ? 3 : validatedStreakRef.current > 3 ? 1 : 0;

    const avgInterval =
      cadenceBufferRef.current.length > 0
        ? cadenceBufferRef.current.reduce((a, b) => a + b, 0) / cadenceBufferRef.current.length
        : 550;
    const spm = Math.min(210, Math.max(40, Math.round(60000 / avgInterval)));

    if (commitDelta > 0) {
      setState((prev) => ({
        ...prev,
        sessionSteps: prev.sessionSteps + commitDelta,
        cadenceSpm: spm,
        lastStepTimestamp: now,
      }));
    }
  }, []);

  const handleDeviceMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const accG = event.accelerationIncludingGravity;
      const accLinear = event.acceleration;
      if (!accG && !accLinear) return;

      const now = performance.now();
      let lx = 0;
      let ly = 0;
      let lz = 0;

      if (accLinear && accLinear.x !== null && accLinear.y !== null && accLinear.z !== null) {
        lx = accLinear.x;
        ly = accLinear.y;
        lz = accLinear.z;
      } else if (accG && accG.x !== null && accG.y !== null && accG.z !== null) {
        // Low-pass filter isolates gravity vector (alpha = 0.85)
        const alpha = 0.85;
        gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * accG.x;
        gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * accG.y;
        gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * accG.z;
        lx = accG.x - gravityRef.current.x;
        ly = accG.y - gravityRef.current.y;
        lz = accG.z - gravityRef.current.z;
      } else {
        return;
      }

      if (!receivedEventRef.current && (Math.abs(lx) > 0.001 || Math.abs(ly) > 0.001 || Math.abs(lz) > 0.001)) {
        receivedEventRef.current = true;
        setState((prev) => ({ ...prev, hardwareDetected: true }));
      }

      // Smooth linear acceleration magnitude
      const rawMag = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const smoothed = prevFilteredRef.current * 0.45 + rawMag * 0.55;
      prevFilteredRef.current = smoothed;

      const window = recentMagnitudesRef.current;
      window.push(smoothed);
      if (window.length > 45) window.shift();

      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const adaptiveThreshold = Math.max(1.35, mean * 1.45);

      if (smoothed > peakCandidateRef.current) {
        peakCandidateRef.current = smoothed;
        risingRef.current = true;
      } else if (risingRef.current && smoothed < peakCandidateRef.current * 0.8) {
        if (peakCandidateRef.current >= adaptiveThreshold) {
          registerStep(now);
        }
        risingRef.current = false;
        peakCandidateRef.current = smoothed;
      }

      setState((prev) => ({
        ...prev,
        liveMagnitude: Number(smoothed.toFixed(2)),
      }));
    },
    [registerStep]
  );

  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    if (simIntervalRef.current !== null) {
      window.clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (hardwareTimeoutRef.current !== null) {
      window.clearTimeout(hardwareTimeoutRef.current);
      hardwareTimeoutRef.current = null;
    }
    releaseWakeLock();
    setState((prev) => ({
      ...prev,
      isTracking: false,
      isSimulating: false,
      liveMagnitude: 0,
    }));
  }, [handleDeviceMotion, releaseWakeLock]);

  const startSensor = useCallback(async () => {
    setState((prev) => ({ ...prev, errorMessage: null }));

    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setState((prev) => ({
        ...prev,
        permission: 'unsupported',
        errorMessage: 'Motion sensors are unavailable in this browser. Use Walk Test Mode or manual logging.',
      }));
      return false;
    }

    const DeviceMotionCtor = window.DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
    if (typeof DeviceMotionCtor.requestPermission === 'function') {
      try {
        const result = await DeviceMotionCtor.requestPermission();
        if (result !== 'granted') {
          setState((prev) => ({
            ...prev,
            permission: 'denied',
            errorMessage: 'Motion & Fitness permission was denied on iOS. Enable Motion access in Safari settings.',
          }));
          return false;
        }
      } catch {
        setState((prev) => ({
          ...prev,
          permission: 'denied',
          errorMessage: 'Could not request iOS Motion permission. Tap Start again directly.',
        }));
        return false;
      }
    }

    receivedEventRef.current = false;
    validatedStreakRef.current = 0;
    cadenceBufferRef.current = [];
    lastPeakTimeRef.current = 0;

    window.addEventListener('devicemotion', handleDeviceMotion);
    requestWakeLock();

    if (timerIntervalRef.current !== null) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setState((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);

    // If desktop browser fires zero non-zero motion events after 1.5s, surface helpful hint
    hardwareTimeoutRef.current = window.setTimeout(() => {
      if (!receivedEventRef.current) {
        setState((prev) => ({
          ...prev,
          hardwareDetected: false,
        }));
      }
    }, 1500);

    setState((prev) => ({
      ...prev,
      permission: 'granted',
      isTracking: true,
      isSimulating: false,
    }));
    return true;
  }, [handleDeviceMotion, requestWakeLock]);

  const startWalkTestSimulation = useCallback((cadenceSpm = 112) => {
    stopTracking();
    const intervalMs = Math.round(60000 / cadenceSpm);
    timerIntervalRef.current = window.setInterval(() => {
      setState((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);

    simIntervalRef.current = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        sessionSteps: prev.sessionSteps + 1,
        cadenceSpm,
        liveMagnitude: Number((2.1 + Math.random() * 0.9).toFixed(2)),
        lastStepTimestamp: performance.now(),
      }));
    }, intervalMs);

    setState((prev) => ({
      ...prev,
      isTracking: true,
      isSimulating: true,
      cadenceSpm,
      errorMessage: null,
    }));
  }, [stopTracking]);

  const resetSession = useCallback(() => {
    stopTracking();
    validatedStreakRef.current = 0;
    cadenceBufferRef.current = [];
    lastPeakTimeRef.current = 0;
    setState((prev) => ({
      ...prev,
      sessionSteps: 0,
      elapsedSeconds: 0,
      cadenceSpm: 0,
      liveMagnitude: 0,
      lastStepTimestamp: null,
      errorMessage: null,
    }));
  }, [stopTracking]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    startSensor,
    stopTracking,
    startWalkTestSimulation,
    resetSession,
  };
}
