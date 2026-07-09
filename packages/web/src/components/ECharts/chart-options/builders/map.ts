import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { getMapKey, normalizeMapDataNames } from '../map-utils';
import type { MapColorStop, MapInput } from '../../types';
import { DEFAULT_COLOR_STOPS } from '../constants';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { unwrapParam } from '../tooltip';
import { computeDataRange } from './_helpers';
export function buildMapColorStops(colorStops?: MapColorStop[]): string[] {
  if (!colorStops || colorStops.length === 0) {
    return DEFAULT_COLOR_STOPS;
  }
  return [...colorStops]
    .sort((a, b) => a.offset - b.offset)
    .map((stop) => stop.color);
}

type GetRegisteredMap = (
  name: string
) => ReturnType<typeof echarts.getMap> | undefined;

export function buildMapOption(
  mapData: MapInput,
  getRegisteredMap: GetRegisteredMap = echarts.getMap
): EChartsOption {
  const mapKey = getMapKey(mapData.region, mapData.detail, mapData.prefecture);

  const registered = getRegisteredMap(mapKey);
  const featureNames = new Set<string>(
    // ECharts >=5.4.0 exposes geoJSON; earlier versions use geoJson
    (registered?.geoJSON ?? registered?.geoJson)?.features?.map(
      (f: { properties?: { name?: string } }) => f.properties?.name ?? ''
    ) ?? []
  );

  const normalizedData = normalizeMapDataNames(mapData.data, featureNames);

  const { min: minValue, max: maxValue } = computeDataRange(normalizedData, {
    min: mapData.min,
    max: mapData.max,
  });
  const colorStops = buildMapColorStops(mapData.colorStops);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: TopLevelFormatterParams) => {
        const target = unwrapParam(params);
        const rawValue = target?.value;
        const value =
          typeof rawValue === 'number'
            ? rawValue.toLocaleString()
            : typeof rawValue === 'string'
              ? rawValue.toLocaleString()
              : 'N/A';

        return `${target?.name ?? 'N/A'}: ${value}`;
      },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      text: ['High', 'Low'],
      realtime: false,
      calculable: true,
      inRange: {
        color: colorStops,
      },
    },
    series: [
      {
        type: 'map',
        map: mapKey,
        data: normalizedData,
        roam: true,
        layoutCenter: ['50%', '50%'],
        layoutSize: '95%',
        label: {
          show: false,
        },
        emphasis: {
          label: { show: true },
          itemStyle: {
            areaColor: '#ffd700',
          },
        },
        select: {
          itemStyle: {
            areaColor: '#4575b4',
          },
        },
        itemStyle: {
          borderColor: '#999',
          borderWidth: 0.5,
        },
      },
    ],
  };
}
