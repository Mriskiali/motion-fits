import { useEffect, useRef } from 'react';

/**
 * Dev-only render profiler.
 *
 * Usage (temporarily, during performance investigation):
 *   useRenderProfiler('SettingsScreen');
 *
 * Logs to the console when a component's render takes longer than `thresholdMs`,
 * and also logs the render count per rolling 1s window so render storms are visible.
 *
 * This is a no-op in production (__DEV__ === false).
 */
export function useRenderProfiler(label: string, thresholdMs = 16): void {
  const renderCountRef = useRef(0);
  const windowStartRef = useRef(Date.now());
  const lastRenderStartRef = useRef(0);

  // Capture the time at the start of this render.
  if (__DEV__) {
    lastRenderStartRef.current = Date.now();
  }

  useEffect(() => {
    if (!__DEV__) return;
    const now = Date.now();
    renderCountRef.current += 1;

    const renderDuration = now - lastRenderStartRef.current;
    if (renderDuration > thresholdMs) {
      console.log(`[Perf] ${label} render took ${renderDuration}ms (commit elapsed)`);
    }

    // Report render frequency once per second.
    if (now - windowStartRef.current >= 1000) {
      console.log(`[Perf] ${label} rendered ${renderCountRef.current}x in the last ${now - windowStartRef.current}ms`);
      renderCountRef.current = 0;
      windowStartRef.current = now;
    }
  });
}

/** Logs how long a synchronous block took (e.g. a style rebuild). */
export function measure<T>(label: string, fn: () => T): T {
  if (!__DEV__) return fn();
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  if (duration > 16) {
    console.log(`[Perf] ${label} took ${duration}ms`);
  }
  return result;
}
