import { useEffect, useState } from 'react';
import * as echarts from 'echarts';
import {
  getMapKey,
  getGeoJsonPath,
} from '../components/ECharts/chart-options/map-utils';

export interface UseGeoJSONResult {
  geoJson: unknown | null;
  loading: boolean;
  error: 'load_failed' | null;
}

/**
 * Fetches and registers a GeoJSON map for the given region and detail level.
 * Caches the result via `echarts.registerMap` to avoid redundant network requests.
 * Automatically aborts in-flight requests on unmount or dependency change.
 */
export function useGeoJSON(
  region: string | undefined,
  detail?: string,
  prefecture?: string
): UseGeoJSONResult {
  const [geoJson, setGeoJson] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'load_failed' | null>(null);

  useEffect(() => {
    if (!region) {
      setGeoJson(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const loadGeoJSON = async () => {
      const mapKey = getMapKey(region, detail, prefecture);

      const cached = echarts.getMap(mapKey);
      if (cached) {
        setGeoJson(cached);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = getGeoJsonPath(region, detail, prefecture);

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new Error('load_failed');

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray(data.features)
        ) {
          throw new Error('load_failed');
        }

        echarts.registerMap(mapKey, data);
        setGeoJson(data);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('GeoJSON load failed:', e);
        setGeoJson(null);
        setError('load_failed');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadGeoJSON();
    return () => controller.abort();
  }, [detail, prefecture, region]);

  return { geoJson, loading, error };
}
