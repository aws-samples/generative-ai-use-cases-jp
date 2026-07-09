import type * as echarts from 'echarts';
import type { ScatterChartInput, ScatterDataPoint } from '../../types';
import {
  COLORS,
  BUBBLE_SIZE_SCALE,
  BUBBLE_SIZE_DEFAULT,
  LEGEND_TOP,
  X_AXIS_NAME_GAP,
} from '../constants';
import { buildScatterTooltipFormatter } from '../tooltip';
import { buildAxisGrid, hasMultipleSeries } from './_helpers';

function scatterPointValue(
  item: ScatterDataPoint
): number | [number, number] | [number, number, number] {
  if (item.x !== undefined && item.y !== undefined) return [item.x, item.y];
  // Validation guarantees value is defined when x/y are absent (isValidScatterDataPoint)
  return item.value!;
}

function buildScatterSeries(input: ScatterChartInput) {
  const isMultiSeries = hasMultipleSeries(input);
  const multiSeries = input.series ?? [];

  const isBubble =
    !isMultiSeries &&
    input.data.some(
      (item) => Array.isArray(item.value) && item.value.length === 3
    );

  const bubbleSize = isBubble
    ? (val: number[]) => {
        const size = val[2];
        return size != null
          ? Math.sqrt(size) * BUBBLE_SIZE_SCALE
          : BUBBLE_SIZE_DEFAULT;
      }
    : undefined;

  return isMultiSeries
    ? multiSeries.map((series) => ({
        name: series.name,
        type: 'scatter' as const,
        data: series.data.map((item: ScatterDataPoint) => ({
          name: item.name,
          value: scatterPointValue(item),
          ...(item.color && { itemStyle: { color: item.color } }),
        })),
      }))
    : [
        {
          type: 'scatter' as const,
          ...(bubbleSize && { symbolSize: bubbleSize }),
          data: input.data.map((item: ScatterDataPoint) => ({
            name: item.name,
            value: scatterPointValue(item),
            ...(item.color && { itemStyle: { color: item.color } }),
          })),
        },
      ];
}

export function buildScatterOption(
  input: ScatterChartInput
): echarts.EChartsOption {
  const isMultiSeries = hasMultipleSeries(input);
  return {
    color: COLORS,
    tooltip: {
      trigger: 'item',
      formatter: buildScatterTooltipFormatter(input),
    },
    legend: isMultiSeries ? { top: LEGEND_TOP } : undefined,
    grid: buildAxisGrid(isMultiSeries, input.xAxisLabel),
    xAxis: {
      type: 'value',
      name: input.xAxisLabel,
      nameLocation: 'middle',
      nameGap: X_AXIS_NAME_GAP,
    },
    yAxis: { type: 'value', name: input.yAxisLabel },
    series: buildScatterSeries(input),
  };
}
