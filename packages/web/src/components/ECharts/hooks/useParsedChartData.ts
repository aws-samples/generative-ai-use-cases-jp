import { useMemo } from 'react';
import { resolveValidatedData, type ValidatedData } from '../chart-options';
import { checkChartSizeLimits } from '../validation';

export function useParsedChartData(code: string) {
  return useMemo(() => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      return {
        parsed: null,
        isValid: false,
        validatedData: null as ValidatedData,
        sizeLimitReason: null,
      };
    }

    try {
      const parsed: unknown = JSON.parse(code);
      const validatedData = resolveValidatedData(parsed);
      const isValid = validatedData !== null;
      const sizeLimitReason = !isValid ? checkChartSizeLimits(parsed) : null;

      return { parsed, isValid, validatedData, sizeLimitReason };
    } catch (e) {
      console.debug('[ECharts] JSON parse failed:', e);
      return {
        parsed: null,
        isValid: false,
        validatedData: null as ValidatedData,
        sizeLimitReason: null,
      };
    }
  }, [code]);
}
