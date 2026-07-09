import type * as echarts from 'echarts';
import type { RadarInput } from '../../types';
import { COLORS } from '../constants';
import { buildItemTooltipFormatter } from '../tooltip';

export function buildRadarOption(input: RadarInput): echarts.EChartsOption {
  return {
    color: COLORS,
    tooltip: { trigger: 'item', formatter: buildItemTooltipFormatter() },
    radar: {
      indicator: input.indicators.map((indicator) => ({
        name: indicator.name,
        max: indicator.max,
      })),
    },
    series: [
      {
        type: 'radar',
        data: input.data.map((datum) => ({
          name: datum.name,
          value: datum.value,
        })),
      },
    ],
  };
}
