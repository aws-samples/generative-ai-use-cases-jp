import type * as echarts from 'echarts';
import type { BasicChartInput, ScatterChartInput } from '../../types';
import { normalizeSeriesData, hasMultipleSeries } from './_helpers';
import { COLORS, LEGEND_TOP, X_AXIS_NAME_GAP } from '../constants';
import { buildAxisTooltipFormatter } from '../tooltip';
import { toColoredDatum, buildAxisGrid } from './_helpers';

function getCategoryData(input: BasicChartInput | ScatterChartInput): string[] {
  if (input.series && input.series.length > 0) {
    return input.series[0].data.map((item: { name: string }) => item.name);
  }
  return input.data
    ? input.data.map((item: { name: string }) => item.name)
    : [];
}

function buildCategorySeries(
  input: BasicChartInput,
  chartType: 'bar' | 'line',
  normalizedMultiSeries?: ReturnType<typeof normalizeSeriesData>,
  extra?: (series: { areaStyle?: object }) => void
) {
  const isMultiSeries = hasMultipleSeries(input);
  const multiSeries = input.series ?? [];
  if (isMultiSeries && normalizedMultiSeries) {
    return normalizedMultiSeries.series.map(
      (series: { name: string; data: Array<number | null> }) => {
        const entry: Record<string, unknown> = {
          name: series.name,
          type: chartType,
          data: series.data,
        };
        if (extra) extra(entry);
        return entry;
      }
    );
  }

  if (isMultiSeries) {
    return multiSeries.map((series) => {
      const entry: Record<string, unknown> = {
        name: series.name,
        type: chartType,
        data: series.data.map(toColoredDatum),
      };
      if (extra) extra(entry);
      return entry;
    });
  }

  const entry: Record<string, unknown> = {
    type: chartType,
    data: input.data ? input.data.map(toColoredDatum) : [],
  };
  if (extra) extra(entry);
  return [entry];
}

export function buildCategoryChartOption(
  input: BasicChartInput,
  chartType: 'bar' | 'line' | 'area'
): echarts.EChartsOption {
  const isMultiSeries = hasMultipleSeries(input);
  const normalized = normalizeSeriesData(input.series ?? []);
  const categoryData = normalized?.categories ?? getCategoryData(input);
  const seriesType = chartType === 'area' ? 'line' : chartType;
  const extra =
    chartType === 'area'
      ? (e: { areaStyle?: object }) => {
          e.areaStyle = {};
        }
      : undefined;
  return {
    color: COLORS,
    tooltip: { trigger: 'axis', formatter: buildAxisTooltipFormatter() },
    legend: isMultiSeries ? { top: LEGEND_TOP } : undefined,
    grid: buildAxisGrid(isMultiSeries, input.xAxisLabel),
    xAxis: {
      type: 'category',
      data: categoryData,
      name: input.xAxisLabel,
      nameLocation: 'middle',
      nameGap: X_AXIS_NAME_GAP,
    },
    yAxis: { type: 'value', name: input.yAxisLabel },
    series: buildCategorySeries(input, seriesType, normalized, extra),
  };
}
