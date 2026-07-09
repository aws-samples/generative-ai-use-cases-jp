import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { buildChartOption, type ValidatedData } from './chart-options';
import { CHART_CONTAINER_HEIGHT } from './chart-options/constants';
import { useScheduleResize } from './hooks/useScheduleResize';
import { ChartAlert } from './ChartAlert';

interface EChartsRendererProps {
  rawJson: string;
  validatedData: ValidatedData;
  sizeLimitReason?: string | null;
  onChartInit?: (instance: echarts.ECharts | null) => void;
  containerStyle?: React.CSSProperties;
}

const EChartsRenderer: React.FC<EChartsRendererProps> = ({
  rawJson,
  validatedData,
  sizeLimitReason,
  onChartInit,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onChartInitRef = useRef(onChartInit);
  onChartInitRef.current = onChartInit;
  const [chartReady, setChartReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const scheduleResize = useScheduleResize(() => chartRef.current);

  const mapData = useMemo(
    () => (validatedData?.kind === 'map' ? validatedData.data : null),
    [validatedData]
  );

  const {
    geoJson,
    loading: geoLoading,
    error: geoError,
  } = useGeoJSON(mapData?.region, mapData?.detail, mapData?.prefecture);

  const chartData = validatedData?.data ?? null;

  const canRenderChartContainer =
    validatedData !== null && chartData !== null && !(mapData && geoError);

  useEffect(() => {
    let cancelled = false;

    if (!canRenderChartContainer) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    // ResizeObserver-gated init: container starts with height=0 due to CSS toggle
    // in EChartsWithToggle (visible/invisible). Initialize ECharts only after first
    // non-zero size measurement, then reuse the observer for subsequent resizes.
    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      if (!chartRef.current && !cancelled && width > 0 && height > 0) {
        try {
          const instance = echarts.init(container);
          chartRef.current = instance;
          setChartReady(true);
          onChartInitRef.current?.(instance);
          scheduleResize();
        } catch (e) {
          setRenderError(
            e instanceof Error ? e.message : 'Chart initialization failed'
          );
        }
      } else if (chartRef.current) {
        scheduleResize();
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.dispose();
      chartRef.current = null;
      setChartReady(false);
      onChartInitRef.current?.(null);
    };
  }, [canRenderChartContainer, scheduleResize]);

  useEffect(() => {
    if (!chartReady || !chartRef.current || !validatedData) {
      return;
    }

    setRenderError(null);

    try {
      if (mapData && geoLoading) {
        // Still waiting for geoJson, skip rendering
        return;
      }

      const resolved = buildChartOption(validatedData);
      if (!resolved) {
        setRenderError('Failed to build chart options');
        return;
      }

      if (validatedData.kind === 'map') chartRef.current.clear();
      chartRef.current.setOption(resolved, { notMerge: true });
      scheduleResize();
    } catch (error) {
      setRenderError(
        error instanceof Error ? error.message : 'Failed to render chart'
      );
    }
  }, [chartReady, geoJson, geoLoading, mapData, scheduleResize, validatedData]);

  if (renderError) {
    return (
      <ChartAlert
        variant="error"
        title={t('chart.invalid_data')}
        rawJson={rawJson}
      />
    );
  }

  if (!chartData) {
    if (sizeLimitReason) {
      return (
        <ChartAlert
          variant="warning"
          title={t('chart.data_limit_exceeded')}
          detail={sizeLimitReason}
        />
      );
    }
    return (
      <ChartAlert
        variant="error"
        title={t('chart.invalid_data')}
        rawJson={rawJson}
      />
    );
  }

  if (mapData && geoError) {
    return (
      <ChartAlert
        variant="error"
        title={t('chart.invalid_data')}
        detail={t('chart.geojson_load_failed')}
      />
    );
  }

  const showMapLoadingOverlay = Boolean(mapData && geoLoading);
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: CHART_CONTAINER_HEIGHT,
  };

  return (
    <div>
      {chartData.title && (
        <h3 className="mb-2 text-lg font-semibold">{chartData.title}</h3>
      )}
      <div className="relative">
        <div
          ref={containerRef}
          data-testid="echarts-container"
          role="img"
          aria-label={chartData.title ?? t('chart.label')}
          style={containerStyle ?? defaultStyle}
        />
        {showMapLoadingOverlay && (
          <div
            data-testid="map-loading-overlay"
            className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="text-gray-500">{t('common.loading')}</div>
          </div>
        )}
      </div>
      {mapData?.region === 'japan' && (
        <p className="mt-1 text-right text-xs text-gray-500">
          {t('chart.map_source_attribution')}
        </p>
      )}
    </div>
  );
};

export default EChartsRenderer;
