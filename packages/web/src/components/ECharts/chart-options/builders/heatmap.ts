import type * as echarts from 'echarts';
import type { HeatmapInput } from '../../types';
import { COLORS, AXIS_GRID, DEFAULT_COLOR_STOPS } from '../constants';
import { buildItemTooltipFormatter } from '../tooltip';
import { computeDataRange } from './_helpers';

export function buildHeatmapOption(input: HeatmapInput): echarts.EChartsOption {
  const { min: heatMin, max: heatMax } = computeDataRange(input.data);
  return {
    color: COLORS,
    grid: AXIS_GRID,
    tooltip: { trigger: 'item', formatter: buildItemTooltipFormatter() },
    xAxis: { type: 'category', data: input.xLabels },
    yAxis: { type: 'category', data: input.yLabels },
    visualMap: {
      min: heatMin,
      max: heatMax,
      calculable: true,
      inRange: { color: DEFAULT_COLOR_STOPS },
    },
    series: [
      {
        type: 'heatmap',
        data: input.data.map((d) => [d.x, d.y, d.value]),
        label: { show: true },
      },
    ],
  };
}
