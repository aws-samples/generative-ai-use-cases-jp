import { describe, expect, it } from 'vitest';
import { buildHeatmapOption } from '../../../src/components/ECharts/chart-options/builders/heatmap';
import type { VisualMapComponentOption } from 'echarts';

describe('buildHeatmapOption defensive min/max', () => {
  it('uses 0 for min/max when all data values are null', () => {
    const option = buildHeatmapOption({
      type: 'heatmap',
      xLabels: ['A'],
      yLabels: ['B'],
      data: [{ x: 0, y: 0, value: null }],
    });
    const visualMap = option.visualMap as VisualMapComponentOption;
    expect((visualMap as { min: number }).min).toBe(0);
    expect((visualMap as { max: number }).max).toBe(0);
  });
});
