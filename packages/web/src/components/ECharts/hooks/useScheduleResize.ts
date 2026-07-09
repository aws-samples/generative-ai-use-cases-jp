import { useCallback, useEffect, useRef } from 'react';
import type * as echarts from 'echarts';

export function useScheduleResize(
  getTarget: () => echarts.ECharts | null
): () => void {
  const getTargetRef = useRef(getTarget);
  getTargetRef.current = getTarget;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      getTargetRef.current()?.resize();
    });
  }, []);
}
