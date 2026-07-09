import type * as echarts from 'echarts';
import type { BoxplotInput, CandlestickInput } from '../../types';
import {
  buildItemTooltipFormatter,
  buildAxisTooltipFormatter,
} from '../tooltip';
import { buildSimpleAxisChart } from './_helpers';

export function buildBoxplotOption(input: BoxplotInput): echarts.EChartsOption {
  return buildSimpleAxisChart({
    type: 'boxplot',
    data: input.data,
    labels: input.labels,
    tooltip: { trigger: 'item', formatter: buildItemTooltipFormatter() },
  });
}

export function buildCandlestickOption(
  input: CandlestickInput
): echarts.EChartsOption {
  return buildSimpleAxisChart({
    type: 'candlestick',
    data: input.data,
    labels: input.dates,
    tooltip: { trigger: 'axis', formatter: buildAxisTooltipFormatter() },
  });
}
