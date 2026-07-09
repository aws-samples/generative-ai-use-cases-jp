import type * as echarts from 'echarts';
import type {
  BasicChartInput,
  BoxplotInput,
  CandlestickInput,
  HeatmapInput,
  MapInput,
  RadarInput,
  ScatterChartInput,
} from '../types';
import {
  validateBasicChart,
  validateBoxplot,
  validateCandlestick,
  validateHeatmap,
  validateMap,
  validateRadar,
  MAX_STRING_LENGTH,
  MAX_OPTIONS_JSON_LENGTH,
} from '../validation';
import { sanitizeOptions, enforceTooltipSafety } from './sanitize';
import { deepMerge } from './deep-merge';
import { buildCategoryChartOption } from './builders/category';
import { buildPieOption } from './builders/pie';
import { buildScatterOption } from './builders/scatter';
import { buildHeatmapOption } from './builders/heatmap';
import { buildRadarOption } from './builders/radar';
import { buildMapOption } from './builders/map';
import {
  buildBoxplotOption,
  buildCandlestickOption,
} from './builders/simple-axis';

export type ValidatedData =
  | { kind: 'basic'; data: BasicChartInput | ScatterChartInput }
  | { kind: 'boxplot'; data: BoxplotInput }
  | { kind: 'heatmap'; data: HeatmapInput }
  | { kind: 'radar'; data: RadarInput }
  | { kind: 'candlestick'; data: CandlestickInput }
  | { kind: 'map'; data: MapInput }
  | null;

function hasValidOptions(raw: unknown): raw is Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return false;
  const opts = (raw as Record<string, unknown>).options;
  if (opts === undefined) return true;
  return typeof opts === 'object' && !Array.isArray(opts) && opts !== null;
}

export function resolveValidatedData(raw: unknown): ValidatedData {
  if (!hasValidOptions(raw)) return null;
  if (typeof raw.title === 'string' && raw.title.length > MAX_STRING_LENGTH)
    return null;
  if (
    typeof raw.xAxisLabel === 'string' &&
    raw.xAxisLabel.length > MAX_STRING_LENGTH
  )
    return null;
  if (
    typeof raw.yAxisLabel === 'string' &&
    raw.yAxisLabel.length > MAX_STRING_LENGTH
  )
    return null;
  if (raw.options !== undefined) {
    try {
      if (JSON.stringify(raw.options).length > MAX_OPTIONS_JSON_LENGTH)
        return null;
    } catch {
      return null;
    }
  }
  if (validateBasicChart(raw)) return { kind: 'basic', data: raw };
  if (validateBoxplot(raw)) return { kind: 'boxplot', data: raw };
  if (validateHeatmap(raw)) return { kind: 'heatmap', data: raw };
  if (validateRadar(raw)) return { kind: 'radar', data: raw };
  if (validateCandlestick(raw)) return { kind: 'candlestick', data: raw };
  if (validateMap(raw)) return { kind: 'map', data: raw };
  return null;
}

function buildBasicOption(
  input: BasicChartInput | ScatterChartInput
): echarts.EChartsOption {
  switch (input.type) {
    case 'bar':
    case 'line':
    case 'area':
      return buildCategoryChartOption(input, input.type);
    case 'pie':
      return buildPieOption(input);
    case 'scatter':
      return buildScatterOption(input);
  }
}

export function buildChartOption(
  validated: NonNullable<ValidatedData>
): echarts.EChartsOption | null {
  let option: echarts.EChartsOption | null;
  switch (validated.kind) {
    case 'basic':
      option = buildBasicOption(validated.data);
      break;
    case 'boxplot':
      option = buildBoxplotOption(validated.data);
      break;
    case 'heatmap':
      option = buildHeatmapOption(validated.data);
      break;
    case 'radar':
      option = buildRadarOption(validated.data);
      break;
    case 'candlestick':
      option = buildCandlestickOption(validated.data);
      break;
    case 'map':
      option = buildMapOption(validated.data);
      break;
    default: {
      const _exhaustive: never = validated;
      void _exhaustive;
      return null;
    }
  }
  const passthrough = validated.data.options;
  if (option != null && passthrough != null) {
    option = deepMerge(
      option as Record<string, unknown>,
      sanitizeOptions(passthrough) as Record<string, unknown>
    ) as echarts.EChartsOption;
  }
  return option != null ? enforceTooltipSafety(option) : null;
}
