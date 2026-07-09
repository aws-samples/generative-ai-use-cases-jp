import type {
  BasicChartInput,
  BoxplotInput,
  CandlestickInput,
  HeatmapInput,
  MapColorStop,
  MapInput,
  RadarInput,
  ScatterChartInput,
  ScatterDataPoint,
} from './types';
import { isPlainObject } from './chart-options/safety';

export const MAX_DATA_POINTS = 10000;
export const MAX_SERIES = 50;
export const MAX_STRING_LENGTH = 500;
/** Maximum character length of serialized options JSON */
export const MAX_OPTIONS_JSON_LENGTH = 10000;

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

const CSS_COLOR_RE =
  /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|rgba|hsl|hsla)\([^)]{3,80}\)|[a-z]{3,20})$/i;

function isValidCSSColor(value: unknown): boolean {
  return typeof value === 'string' && CSS_COLOR_RE.test(value);
}

function isValidMapColorStop(value: unknown): value is MapColorStop {
  if (!isPlainObject(value)) return false;
  const offset: unknown = value.offset;
  if (!isValidNumber(offset)) return false;
  if (offset < 0 || offset > 1) return false;
  return typeof value.color === 'string' && CSS_COLOR_RE.test(value.color);
}

function isValidColorStops(value: unknown): value is MapColorStop[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every(isValidMapColorStop)
  );
}

function isValidDataPoint(input: unknown): boolean {
  if (!isPlainObject(input)) return false;
  if (typeof input.name !== 'string') return false;
  if (input.name.length > MAX_STRING_LENGTH) return false;
  if (input.color !== undefined && !isValidCSSColor(input.color)) return false;
  return input.value === null || isValidNumber(input.value);
}

function isValidScatterDataPoint(input: unknown): input is ScatterDataPoint {
  if (!isPlainObject(input)) return false;
  if (typeof input.name !== 'string') return false;
  if (input.name.length > MAX_STRING_LENGTH) return false;
  if (input.color !== undefined && !isValidCSSColor(input.color)) return false;

  // x/y format
  if (isValidNumber(input.x) && isValidNumber(input.y)) {
    return true;
  }

  const value = input.value;
  if (isValidNumber(value)) {
    return true;
  }
  if (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    value.every(isValidNumber)
  ) {
    return true;
  }
  return false;
}

function validateDataArray(data: unknown[], isScatter: boolean): boolean {
  if (data.length > MAX_DATA_POINTS) return false;
  for (const item of data) {
    if (isScatter ? !isValidScatterDataPoint(item) : !isValidDataPoint(item)) {
      return false;
    }
  }
  return true;
}

function checkSeriesStructure(series: unknown[]): boolean {
  if (series.length > MAX_SERIES) return false;
  const first = series[0];
  if (!isPlainObject(first) || !Array.isArray(first.data)) return false;
  const total = series.reduce(
    (s: number, e: unknown) =>
      s + (isPlainObject(e) && Array.isArray(e.data) ? e.data.length : 0),
    0
  );
  return total <= MAX_DATA_POINTS;
}

function checkBarConstraints(series: unknown[]): boolean {
  for (const item of series) {
    if (!isPlainObject(item) || !Array.isArray(item.data)) return false;
    const seen = new Set<string>();
    for (const pt of item.data as unknown[]) {
      if (isPlainObject(pt) && typeof pt.name === 'string') {
        if (seen.has(pt.name)) return false;
        seen.add(pt.name);
      }
    }
  }
  return true;
}

function validateSeriesArray(series: unknown[], type: string): boolean {
  if (!checkSeriesStructure(series)) return false;
  const needsEqual = type === 'bar';
  const isScatter = type === 'scatter';
  if (needsEqual && !checkBarConstraints(series)) return false;
  for (const item of series) {
    if (
      !isPlainObject(item) ||
      typeof item.name !== 'string' ||
      !Array.isArray(item.data)
    )
      return false;
    if (item.name.length > MAX_STRING_LENGTH) return false;
    for (const pt of item.data) {
      if (isScatter ? !isValidScatterDataPoint(pt) : !isValidDataPoint(pt))
        return false;
    }
  }
  return true;
}

export function validateBasicChart(
  input: unknown
): input is BasicChartInput | ScatterChartInput {
  if (!isPlainObject(input)) return false;

  const validTypes: (BasicChartInput['type'] | ScatterChartInput['type'])[] = [
    'bar',
    'line',
    'pie',
    'area',
    'scatter',
  ];
  if (!validTypes.includes(input.type as BasicChartInput['type'])) return false;

  const hasData = Array.isArray(input.data) && input.data.length > 0;
  const hasSeries = Array.isArray(input.series) && input.series.length > 0;
  if (!hasData && !hasSeries) return false;

  const type = input.type as string;
  if (
    hasData &&
    !validateDataArray(input.data as unknown[], type === 'scatter')
  )
    return false;
  if (hasSeries && !validateSeriesArray(input.series as unknown[], type))
    return false;

  return true;
}

export function validateBoxplot(input: unknown): input is BoxplotInput {
  if (!isPlainObject(input) || input.type !== 'boxplot') return false;
  if (!Array.isArray(input.data) || input.data.length === 0) return false;
  if (input.data.length > MAX_DATA_POINTS) return false;

  if (input.labels !== undefined) {
    if (!isStringArray(input.labels)) return false;
    if (input.labels.length !== input.data.length) return false;
    for (const label of input.labels) {
      if (label.length > MAX_STRING_LENGTH) return false;
    }
  }

  for (const item of input.data as unknown[]) {
    if (!Array.isArray(item) || item.length !== 5) return false;
    for (const value of item) {
      if (!isValidNumber(value)) return false;
    }
  }

  return true;
}

export function validateHeatmap(input: unknown): input is HeatmapInput {
  if (!isPlainObject(input) || input.type !== 'heatmap') return false;
  if (!Array.isArray(input.xLabels) || input.xLabels.length === 0) return false;
  if (!Array.isArray(input.yLabels) || input.yLabels.length === 0) return false;
  if (!Array.isArray(input.data) || input.data.length === 0) return false;
  if (input.data.length > MAX_DATA_POINTS) return false;

  for (const label of input.xLabels as unknown[]) {
    if (typeof label !== 'string' || label.length > MAX_STRING_LENGTH)
      return false;
  }
  for (const label of input.yLabels as unknown[]) {
    if (typeof label !== 'string' || label.length > MAX_STRING_LENGTH)
      return false;
  }

  for (const item of input.data as unknown[]) {
    if (!isPlainObject(item)) return false;
    if (!isValidNumber(item.x) || !isValidNumber(item.y)) return false;
    if (item.value !== null && !isValidNumber(item.value)) return false;
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y)) return false;
    if ((item.x as number) < 0 || (item.x as number) >= input.xLabels.length)
      return false;
    if ((item.y as number) < 0 || (item.y as number) >= input.yLabels.length)
      return false;
  }

  return true;
}

export function validateRadar(input: unknown): input is RadarInput {
  if (!isPlainObject(input) || input.type !== 'radar') return false;
  if (!Array.isArray(input.indicators) || input.indicators.length === 0)
    return false;
  if (!Array.isArray(input.data) || input.data.length === 0) return false;
  if (input.data.length > MAX_SERIES) return false;

  for (const indicator of input.indicators as unknown[]) {
    if (!isPlainObject(indicator)) return false;
    if (typeof indicator.name !== 'string' || !isValidNumber(indicator.max)) {
      return false;
    }
    if (indicator.name.length > MAX_STRING_LENGTH) return false;
  }

  const indicatorCount = input.indicators.length;
  for (const item of input.data as unknown[]) {
    if (!isPlainObject(item)) return false;
    if (typeof item.name !== 'string' || !Array.isArray(item.value))
      return false;
    if (item.name.length > MAX_STRING_LENGTH) return false;
    if (item.value.length !== indicatorCount) return false;

    for (const value of item.value) {
      if (!isValidNumber(value)) return false;
    }
  }

  return true;
}

export function validateCandlestick(input: unknown): input is CandlestickInput {
  if (!isPlainObject(input) || input.type !== 'candlestick') return false;
  if (!Array.isArray(input.data) || input.data.length === 0) return false;
  if (input.data.length > MAX_DATA_POINTS) return false;

  if (input.dates !== undefined) {
    if (!isStringArray(input.dates)) return false;
    if (input.dates.length !== input.data.length) return false;
    for (const date of input.dates) {
      if (date.length > MAX_STRING_LENGTH) return false;
    }
  }

  for (const item of input.data as unknown[]) {
    if (!Array.isArray(item) || item.length !== 4) return false;
    for (const value of item) {
      if (!isValidNumber(value)) return false;
    }
  }

  return true;
}

export function validateMap(input: unknown): input is MapInput {
  if (!isPlainObject(input) || input.type !== 'map') return false;
  if (input.region !== 'japan' && input.region !== 'world') return false;
  if (
    input.detail !== undefined &&
    input.detail !== 'prefecture' &&
    input.detail !== 'municipality'
  ) {
    return false;
  }
  if (input.region === 'world' && input.detail === 'municipality') {
    return false;
  }
  if (input.min != null && !isValidNumber(input.min)) return false;
  if (input.max != null && !isValidNumber(input.max)) return false;
  if (input.min != null && input.max != null && input.min >= input.max) {
    return false;
  }
  if (input.colorStops != null && !isValidColorStops(input.colorStops)) {
    return false;
  }
  if (!Array.isArray(input.data) || input.data.length === 0) return false;
  if (input.data.length > MAX_DATA_POINTS) return false;

  for (const item of input.data as unknown[]) {
    if (!isValidDataPoint(item)) return false;
  }

  if (
    input.detail === 'municipality' &&
    (typeof input.prefecture !== 'string' ||
      !/^(0[1-9]|[1-3][0-9]|4[0-7])$/.test(input.prefecture))
  ) {
    return false;
  }

  return true;
}

/**
 * Returns a human-readable reason if the chart input exceeds size limits,
 * or null if within limits. Call this when resolveValidatedData returns null
 * to distinguish size-limit violations from structural validation failures.
 */
export function checkChartSizeLimits(input: unknown): string | null {
  if (!isPlainObject(input)) return null;

  if (Array.isArray(input.data)) {
    if (input.data.length > MAX_DATA_POINTS) {
      return `data_points_exceeded:${input.data.length}`;
    }
  }

  if (Array.isArray(input.series)) {
    if (input.series.length > MAX_SERIES) {
      return `series_exceeded:${input.series.length}`;
    }
    const totalPoints = input.series.reduce((sum: number, s: unknown) => {
      if (isPlainObject(s) && Array.isArray(s.data)) return sum + s.data.length;
      return sum;
    }, 0);
    if (totalPoints > MAX_DATA_POINTS) {
      return `data_points_exceeded:${totalPoints}`;
    }
  }

  return null;
}
