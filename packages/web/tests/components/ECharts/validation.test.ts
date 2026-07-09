import { describe, expect, it } from 'vitest';
import { resolveValidatedData } from '../../../src/components/ECharts/chart-options';

describe('color field CSS validation', () => {
  it('passes when color is omitted', () => {
    expect(
      resolveValidatedData({ type: 'pie', data: [{ name: 'A', value: 1 }] })
    ).not.toBeNull();
  });

  it('passes valid hex colors', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: '#ff0000' }],
      })
    ).not.toBeNull();
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: '#fff' }],
      })
    ).not.toBeNull();
  });

  it('passes valid named colors', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'red' }],
      })
    ).not.toBeNull();
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'steelblue' }],
      })
    ).not.toBeNull();
  });

  it('passes valid rgb/rgba/hsl/hsla colors', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'rgb(255,0,0)' }],
      })
    ).not.toBeNull();
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'rgba(0,0,0,0.5)' }],
      })
    ).not.toBeNull();
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'hsl(120,50%,50%)' }],
      })
    ).not.toBeNull();
  });

  it('rejects javascript: URI', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'javascript:alert(1)' }],
      })
    ).toBeNull();
  });

  it('rejects data: URI', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: 'data:text/html,<h1>x</h1>' }],
      })
    ).toBeNull();
  });

  it('rejects empty string', () => {
    expect(
      resolveValidatedData({
        type: 'pie',
        data: [{ name: 'A', value: 1, color: '' }],
      })
    ).toBeNull();
  });
});

describe('options size limit', () => {
  it('passes when options is small', () => {
    expect(
      resolveValidatedData({
        type: 'bar',
        data: [{ name: 'A', value: 1 }],
        options: { yAxis: { min: 0 } },
      })
    ).not.toBeNull();
  });

  it('rejects when options exceeds MAX_OPTIONS_JSON_LENGTH', () => {
    expect(
      resolveValidatedData({
        type: 'bar',
        data: [{ name: 'A', value: 1 }],
        options: { x: 'A'.repeat(10001) },
      })
    ).toBeNull();
  });
});
