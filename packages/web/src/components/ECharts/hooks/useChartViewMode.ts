import { useState, useEffect, useRef } from 'react';

export function useChartViewMode(code: string, isValid: boolean) {
  const [manualViewMode, setManualViewMode] = useState<'chart' | 'code' | null>(
    null
  );
  const [codeEverShown, setCodeEverShown] = useState(false);
  const prevCodeRef = useRef(code);

  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setManualViewMode(null);
    }
  }, [code]);

  const effectiveViewMode = (): 'chart' | 'code' => {
    if (manualViewMode !== null) return manualViewMode;
    if (!code.trim()) return 'code';
    return isValid ? 'chart' : 'code';
  };

  const viewMode = effectiveViewMode();

  useEffect(() => {
    if (viewMode === 'code') setCodeEverShown(true);
  }, [viewMode]);

  return { manualViewMode, setManualViewMode, viewMode, codeEverShown };
}
