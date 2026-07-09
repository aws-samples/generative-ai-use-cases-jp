import type * as echarts from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import type { ScatterChartInput } from '../types';

export type TooltipOption = Exclude<
  NonNullable<echarts.EChartsOption['tooltip']>,
  echarts.EChartsOption['tooltip'][]
>;
export type TooltipFormatter = Exclude<
  TooltipOption['formatter'],
  string | undefined
>;

export interface ScatterTooltipParam {
  name?: string;
  value?: number | [number, number];
  data?: { name?: string; value?: number | [number, number] };
}

export function unwrapParam<T>(p: T | T[]): T {
  return Array.isArray(p) ? p[0] : p;
}

export function buildAxisTooltipFormatter(): TooltipFormatter {
  return (params: TopLevelFormatterParams) => {
    const items = Array.isArray(params) ? params : [params];
    const categoryName = items[0]?.name ?? '';
    const lines = items.map((p) => {
      const series = p.seriesName ?? '';
      const val = p.value != null ? String(p.value) : '-';
      return series ? `${series}: ${val}` : val;
    });
    return [categoryName, ...lines].filter(Boolean).join('\n');
  };
}

export function buildItemTooltipFormatter(): TooltipFormatter {
  return (params: TopLevelFormatterParams) => {
    const p = unwrapParam(params);
    const name = p?.name ?? '';
    const series = p?.seriesName ?? '';
    const val = p?.value != null ? String(p.value) : '-';
    return [series || name, series ? name : '', val].filter(Boolean).join('\n');
  };
}

export function buildScatterTooltipFormatter(
  input: ScatterChartInput
): TooltipFormatter {
  const xLabel = input.xAxisLabel ?? 'x';
  const yLabel = input.yAxisLabel ?? 'y';

  return (params: TopLevelFormatterParams) => {
    const target = unwrapParam(params);
    const datum = target as ScatterTooltipParam;
    const point = datum.data ?? datum;
    const name = point.name ?? datum.name;
    const value = point.value ?? datum.value;

    if (Array.isArray(value)) {
      const [x, y] = value;
      return [name, `${xLabel}: ${x}`, `${yLabel}: ${y}`]
        .filter(Boolean)
        .join('\n');
    }

    return [name, `${yLabel}: ${value ?? '-'}`].filter(Boolean).join('\n');
  };
}
