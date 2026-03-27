import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
}

const useWakeLock = (enabled: boolean): UseWakeLockReturn => {
  const [isSupported] = useState(() => 'wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);
      sentinel.addEventListener('release', () => {
        setIsActive(false);
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
        }
      });
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch {
        // already released
      }
      sentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Acquire/release based on enabled flag
  useEffect(() => {
    if (!isSupported) return;

    if (enabled) {
      acquire();
    } else {
      release();
    }

    return () => {
      release();
    };
  }, [enabled, isSupported, acquire, release]);

  // Re-acquire on visibility change
  useEffect(() => {
    if (!enabled || !isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isSupported, acquire]);

  return { isSupported, isActive };
};

export default useWakeLock;
