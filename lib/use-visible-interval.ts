'use client';

import { useEffect, useEffectEvent } from 'react';

interface UseVisibleIntervalOptions {
  intervalMs: number;
  runImmediately?: boolean;
  enabled?: boolean;
}

export function useVisibleInterval(
  callback: () => void | Promise<void>,
  { intervalMs, runImmediately = false, enabled = true }: UseVisibleIntervalOptions
) {
  const onInterval = useEffectEvent(() => {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    void callback();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (runImmediately) {
      onInterval();
    }

    const interval = window.setInterval(() => {
      onInterval();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, runImmediately]);
}
