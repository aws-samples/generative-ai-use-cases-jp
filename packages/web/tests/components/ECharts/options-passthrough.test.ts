import { describe, expect, it } from 'vitest';
import {
  buildChartOption,
  resolveValidatedData,
} from '../../../src/components/ECharts/chart-options';

describe('options passthrough', () => {
  it('options.yAxis.min is merged into bar chart option', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: { yAxis: { min: 0, max: 100 } },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    const yAxis = option!.yAxis as Record<string, unknown>;
    expect(yAxis.min).toBe(0);
    expect(yAxis.max).toBe(100);
  });

  it('options.series[0].stack is merged into bar chart series', () => {
    const input = {
      type: 'bar',
      series: [
        { name: 'S1', data: [{ name: 'A', value: 10 }] },
        { name: 'S2', data: [{ name: 'A', value: 20 }] },
      ],
      options: { series: [{ stack: 'total', label: { show: true } }] },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    const series = option!.series as Array<Record<string, unknown>>;
    expect(series[0].stack).toBe('total');
    expect((series[0].label as Record<string, unknown>).show).toBe(true);
    // series[1] should be unaffected
    expect(series[1].stack).toBeUndefined();
  });

  it('options.legend.show=false overrides generated legend', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: { legend: { show: false } },
    };
    const validated = resolveValidatedData(input);
    const option = buildChartOption(validated!);
    const legend = option!.legend as Record<string, unknown>;
    expect(legend.show).toBe(false);
  });

  it('options undefined — existing behavior unchanged', () => {
    const input = {
      type: 'bar',
      data: [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
      ],
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    const series = option!.series as Array<Record<string, unknown>>;
    expect(series[0].type).toBe('bar');
    expect(series[0].data).toEqual([10, 20]);
  });

  it('options null — rejected by resolveValidatedData', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: null as unknown as Record<string, unknown>,
    };
    const validated = resolveValidatedData(input);
    expect(validated).toBeNull();
  });

  it('options primitive overwrite — xAxis.name', () => {
    const input = {
      type: 'line',
      data: [{ name: 'A', value: 5 }],
      options: { xAxis: { name: 'Custom X' } },
    };
    const validated = resolveValidatedData(input);
    const option = buildChartOption(validated!);
    const xAxis = option!.xAxis as Record<string, unknown>;
    expect(xAxis.name).toBe('Custom X');
  });

  it('options works for boxplot chart type', () => {
    const input = {
      type: 'boxplot',
      data: [[1, 2, 3, 4, 5]],
      options: { yAxis: { min: -10 } },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    const yAxis = option!.yAxis as Record<string, unknown>;
    expect(yAxis.min).toBe(-10);
  });

  it('options.tooltip.formatter safe string is kept — self-generated function formatter is overridden', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: { tooltip: { formatter: '{b}: {c}' } },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    const tooltip = option!.tooltip as Record<string, unknown>;
    // safe string formatter from user options is preserved after merge
    expect(tooltip.formatter).toBe('{b}: {c}');
  });

  it('options.tooltip.formatter function string is dropped — self-generated formatter is kept', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: { tooltip: { formatter: 'function() { return "evil"; }' } },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    const tooltip = option!.tooltip as Record<string, unknown>;
    expect(typeof tooltip.formatter).toBe('function');
  });

  it('options.graphic is blocked — not present in final merged option', () => {
    const input = {
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      options: { graphic: [{ type: 'text' }] },
    };
    const validated = resolveValidatedData(input);
    expect(validated).not.toBeNull();
    const option = buildChartOption(validated!);
    expect(option).not.toBeNull();
    expect((option as Record<string, unknown>).graphic).toBeUndefined();
  });
});
