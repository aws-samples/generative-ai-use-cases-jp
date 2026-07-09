import { useCallback } from 'react';
import type * as echarts from 'echarts';

export function useChartExport(chartInstance: () => echarts.ECharts | null) {
  return useCallback(() => {
    const instance = chartInstance();

    if (!instance) return;

    const url = instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });

    const link = document.createElement('a');
    link.href = url;
    link.download = `chart_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [chartInstance]);
}
