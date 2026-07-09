import type * as echarts from 'echarts';
import {
  AXIS_GRID,
  COLORS,
  GRID_TOP_WITH_LEGEND,
  GRID_BOTTOM_WITH_LABEL,
} from '../constants';
import type { TooltipFormatter } from '../tooltip';
import { MAX_DATA_POINTS, MAX_SERIES } from '../../validation';

export function hasMultipleSeries(input: { series?: unknown[] }): boolean {
  return Array.isArray(input.series) && input.series.length > 0;
}

export function computeDataRange(
  data: ReadonlyArray<{ value: number | null }>,
  preset?: { min?: number; max?: number }
): { min: number; max: number } {
  let min = preset?.min ?? Infinity;
  let max = preset?.max ?? -Infinity;
  if (preset?.min === undefined || preset?.max === undefined) {
    for (const datum of data) {
      if (!Number.isFinite(datum.value)) continue;
      const v = datum.value as number;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}

export function buildAxisGrid(
  isMultiSeries: boolean,
  xAxisLabel?: string
): echarts.EChartsOption['grid'] {
  return {
    ...AXIS_GRID,
    top: isMultiSeries ? GRID_TOP_WITH_LEGEND : AXIS_GRID.top,
    bottom: xAxisLabel ? GRID_BOTTOM_WITH_LABEL : AXIS_GRID.bottom,
  };
}

export function toColoredDatum<V>(item: {
  value: V;
  color?: string;
}): V | { value: V; itemStyle: { color: string } } {
  return item.color
    ? { value: item.value, itemStyle: { color: item.color } }
    : item.value;
}

export function buildSimpleAxisChart(config: {
  type: 'boxplot' | 'candlestick';
  data: unknown[];
  labels: string[] | undefined;
  tooltip: { trigger: 'item' | 'axis'; formatter: TooltipFormatter };
}): echarts.EChartsOption {
  return {
    color: COLORS,
    grid: AXIS_GRID,
    tooltip: {
      trigger: config.tooltip.trigger,
      formatter: config.tooltip.formatter,
    },
    xAxis: {
      type: 'category',
      data:
        config.labels || config.data.map((_: unknown, i: number) => String(i)),
    },
    yAxis: { type: 'value' },
    series: [
      { type: config.type, data: config.data as number[][] },
    ] as echarts.EChartsOption['series'],
  };
}

export function normalizeSeriesData(
  series: Array<{
    name: string;
    data: Array<{ name: string; value: number | null }>;
  }>
): {
  categories: string[];
  series: Array<{ name: string; data: (number | null)[] }>;
} | null {
  if (!Array.isArray(series) || series.length === 0) {
    return null;
  }

  if (series.length > MAX_SERIES) {
    return null;
  }

  const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);
  if (totalPoints > MAX_DATA_POINTS) {
    return null;
  }

  const categories: string[] = [];
  const seenCategories = new Set<string>();

  const valueMaps: Map<string, number | null>[] = [];

  for (const entry of series) {
    const valueMap = new Map<string, number | null>();

    for (const item of entry.data) {
      if (valueMap.has(item.name)) {
        return null;
      }

      valueMap.set(item.name, item.value);

      if (!seenCategories.has(item.name)) {
        seenCategories.add(item.name);
        categories.push(item.name);
      }
    }

    valueMaps.push(valueMap);
  }

  return {
    categories,
    series: series.map((entry, index) => ({
      name: entry.name,
      data: categories.map(
        (category) => valueMaps[index].get(category) ?? null
      ),
    })),
  };
}
