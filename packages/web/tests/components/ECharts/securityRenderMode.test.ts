import { describe, expect, it } from 'vitest';
import {
  buildChartOption,
  resolveValidatedData,
} from '../../../src/components/ECharts/chart-options';

const allChartTypeSamples = [
  { type: 'bar', data: [{ name: 'A', value: 10 }] },
  { type: 'line', data: [{ name: 'A', value: 10 }] },
  { type: 'area', data: [{ name: 'A', value: 10 }] },
  { type: 'pie', data: [{ name: 'A', value: 10 }] },
  { type: 'scatter', data: [{ name: 'A', value: [1, 2] }] },
  {
    type: 'boxplot',
    data: [[1, 2, 3, 4, 5]],
  },
  {
    type: 'heatmap',
    xLabels: ['Mon'],
    yLabels: ['AM'],
    data: [{ x: 0, y: 0, value: 5 }],
  },
  {
    type: 'radar',
    indicators: [{ name: 'Speed', max: 100 }],
    data: [{ name: 'A', value: [80] }],
  },
  {
    type: 'candlestick',
    dates: ['2024-01-01'],
    data: [[20, 25, 18, 27]],
  },
  {
    type: 'map',
    region: 'japan',
    data: [{ name: 'Tokyo', value: 100 }],
  },
];

const barSample = { type: 'bar', data: [{ name: 'A', value: 10 }] };

describe('tooltip renderMode is forced to richText', () => {
  for (const sample of allChartTypeSamples) {
    it(`enforces richText for ${sample.type}`, () => {
      const validated = resolveValidatedData(sample);
      expect(validated).not.toBeNull();
      const option = buildChartOption(validated!) as Record<string, unknown>;
      expect(option).not.toBeNull();
      const tooltip = option.tooltip as Record<string, unknown>;
      expect(tooltip.renderMode).toBe('richText');
    });
  }

  it('overrides user-provided renderMode html', () => {
    const input = {
      ...barSample,
      options: { tooltip: { renderMode: 'html' } },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!) as Record<string, unknown>;
    const tooltip = option.tooltip as Record<string, unknown>;
    expect(tooltip.renderMode).toBe('richText');
  });

  it('sets confine: true on tooltip', () => {
    const validated = resolveValidatedData(barSample);
    const option = buildChartOption(validated!) as Record<string, unknown>;
    const tooltip = option.tooltip as Record<string, unknown>;
    expect(tooltip.confine).toBe(true);
  });

  it('blocks series-level tooltip renderMode html bypass', () => {
    const input = {
      ...barSample,
      options: {
        series: [
          {
            tooltip: {
              renderMode: 'html',
              formatter: '<img src=x onerror=alert(1)>',
            },
          },
        ],
      },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!) as Record<string, unknown>;
    const series = option.series as Array<Record<string, unknown>>;
    const seriesWithTooltip = series.find((s) => s.tooltip);
    expect(seriesWithTooltip).toBeDefined();
    const seriesTooltip = seriesWithTooltip!.tooltip as Record<string, unknown>;
    expect(seriesTooltip.renderMode).toBe('richText');
  });

  it('blocks object-into-array merge vector for series tooltip', () => {
    const input = {
      ...barSample,
      options: {
        series: { tooltip: { renderMode: 'html' } },
      },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!) as Record<string, unknown>;
    const series = option.series as Array<Record<string, unknown>>;
    for (const s of series) {
      if (s.tooltip) {
        const t = s.tooltip as Record<string, unknown>;
        expect(t.renderMode).toBe('richText');
      }
    }
  });
});
