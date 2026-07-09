import type * as echarts from 'echarts';
import type { BasicChartInput, ChartDataPoint } from '../../types';
import { COLORS, PIE_MULTI_SERIES_RADII, LEGEND_TOP } from '../constants';
import { buildItemTooltipFormatter } from '../tooltip';
import { hasMultipleSeries } from './_helpers';

function toPieDatum(item: ChartDataPoint & { value: number }) {
  return {
    name: item.name,
    value: item.value,
    ...(item.color && { itemStyle: { color: item.color } }),
  };
}

function nonNullData(data: ChartDataPoint[]) {
  return data
    .filter((d): d is ChartDataPoint & { value: number } => d.value !== null)
    .map(toPieDatum);
}

export function buildPieOption(input: BasicChartInput): echarts.EChartsOption {
  const isMultiSeries = hasMultipleSeries(input);
  return {
    color: COLORS,
    tooltip: { trigger: 'item', formatter: buildItemTooltipFormatter() },
    legend: isMultiSeries
      ? { top: LEGEND_TOP }
      : { orient: 'vertical', left: 'left' },
    series: isMultiSeries
      ? (input.series ?? []).map((series, index) => ({
          name: series.name,
          type: 'pie' as const,
          radius:
            PIE_MULTI_SERIES_RADII[index] ??
            PIE_MULTI_SERIES_RADII[PIE_MULTI_SERIES_RADII.length - 1],
          center: ['50%', '50%'],
          data: nonNullData(series.data),
        }))
      : [
          {
            type: 'pie' as const,
            radius: '50%',
            data: nonNullData(input.data ?? []),
          },
        ],
  };
}
