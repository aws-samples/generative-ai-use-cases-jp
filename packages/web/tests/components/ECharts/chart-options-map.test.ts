import { describe, expect, it, vi } from 'vitest';
import { buildMapOption } from '../../../src/components/ECharts/chart-options/builders/map';
import { normalizeMapDataNames } from '../../../src/components/ECharts/chart-options/map-utils';
import type { TooltipComponentOption, VisualMapComponentOption } from 'echarts';

describe('buildMapOption tooltip formatter', () => {
  it('outputs literal text in string value (richText mode — no HTML escaping)', () => {
    const option = buildMapOption({
      type: 'map',
      region: 'japan',
      data: [{ name: 'Tokyo', value: 0 }],
    });
    const tooltip = option.tooltip as TooltipComponentOption;
    const formatter = tooltip.formatter as (params: unknown) => string;
    const result = formatter({
      name: 'Tokyo',
      value: '<script>alert(1)</script>',
    });
    // richText mode: literal text output, no HTML escaping needed
    expect(result).toContain('<script>alert(1)</script>');
    expect(result).not.toContain('&lt;script');
  });
});

describe('buildMapOption defensive min/max', () => {
  it('uses 0 for min/max when data has no finite values', () => {
    const option = buildMapOption({
      type: 'map',
      region: 'japan',
      data: [{ name: 'X', value: NaN }],
    });
    const visualMap = option.visualMap as VisualMapComponentOption;
    expect((visualMap as { min: number }).min).toBe(0);
    expect((visualMap as { max: number }).max).toBe(0);
  });
});

describe('buildMapOption municipality', () => {
  it('passes prefecture to getMapKey for municipality detail', () => {
    const option = buildMapOption({
      type: 'map',
      region: 'japan',
      detail: 'municipality',
      prefecture: '13',
      data: [{ name: 'Shinjuku', value: 100 }],
    });
    const series = (option.series as { map: string }[])[0];
    expect(series.map).toBe('japan-municipality-13');
  });
});

/* eslint-disable i18nhelper/no-jp-string */
describe('normalizeMapDataNames', () => {
  it('returns data unchanged when featureNames is empty', () => {
    const data = [{ name: '川崎市川崎区', value: 1 }];
    expect(normalizeMapDataNames(data, new Set())).toEqual(data);
  });

  it('returns data unchanged when all names already match', () => {
    const data = [{ name: '川崎区', value: 1 }];
    expect(normalizeMapDataNames(data, new Set(['川崎区']))).toEqual(data);
  });

  it('strips city prefix for designated city wards', () => {
    const data = [{ name: '川崎市川崎区', value: 1 }];
    const result = normalizeMapDataNames(data, new Set(['川崎区']));
    expect(result).toEqual([{ name: '川崎区', value: 1 }]);
  });

  it('leaves name unchanged when no matching feature found', () => {
    const data = [{ name: '未知の地名', value: 1 }];
    const result = normalizeMapDataNames(data, new Set(['川崎区']));
    expect(result).toEqual([{ name: '未知の地名', value: 1 }]);
  });

  it('handles mixed data — some match, some need normalization', () => {
    const data = [
      { name: '川崎市川崎区', value: 1 },
      { name: '横浜市', value: 2 },
    ];
    const result = normalizeMapDataNames(data, new Set(['川崎区', '横浜市']));
    expect(result).toEqual([
      { name: '川崎区', value: 1 },
      { name: '横浜市', value: 2 },
    ]);
  });
});

describe('buildMapOption getRegisteredMap injection', () => {
  it('calls the injected stub and uses its feature names for normalization', () => {
    const stub = vi.fn().mockReturnValue({
      geoJSON: {
        features: [{ properties: { name: '川崎区' } }],
      },
    });
    const option = buildMapOption(
      {
        type: 'map',
        region: 'japan',
        data: [{ name: '川崎市川崎区', value: 42 }],
      },
      stub
    );
    expect(stub).toHaveBeenCalledOnce();
    const series = (
      option.series as { data: { name: string; value: number }[] }[]
    )[0];
    expect(series.data[0].name).toBe('川崎区');
  });
});
