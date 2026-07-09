import { useState, memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { VscCode } from 'react-icons/vsc';
import { LuChartBar, LuExpand } from 'react-icons/lu';
import { IoMdDownload } from 'react-icons/io';
import { TbPhoto } from 'react-icons/tb';
import type * as echarts from 'echarts';

import ButtonCopy from '../ButtonCopy';
import Button from '../Button';
import EChartsRenderer from './EChartsRenderer';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { ChartZoomModal } from './ChartZoomModal';
import { useParsedChartData } from './hooks/useParsedChartData';
import { useChartViewMode } from './hooks/useChartViewMode';
import { useChartExport } from './hooks/useChartExport';

import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface EChartsWithToggleProps {
  code: string;
}

export const EChartsWithToggle = memo(({ code }: EChartsWithToggleProps) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(false);

  const mainChartRef = useRef<echarts.ECharts | null>(null);
  const zoomChartRef = useRef<echarts.ECharts | null>(null);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);

  const chartInstance = useCallback((): echarts.ECharts | null => {
    return zoomChartRef.current ?? mainChartRef.current;
  }, []);

  const parsedChartData = useParsedChartData(code);
  const { manualViewMode, setManualViewMode, viewMode, codeEverShown } =
    useChartViewMode(code, parsedChartData.isValid);
  const downloadAsPNG = useChartExport(chartInstance);

  const handleMainChartInit = useCallback(
    (instance: echarts.ECharts | null) => {
      mainChartRef.current = instance;
    },
    []
  );

  const handleZoomChartInit = useCallback(
    (instance: echarts.ECharts | null) => {
      zoomChartRef.current = instance;
    },
    []
  );

  const handleClose = useCallback(() => {
    setZoom(false);
    zoomTriggerRef.current?.focus();
  }, []);

  return (
    <>
      <div className="my-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex rounded border bg-gray-50 text-xs font-bold">
              <button
                type="button"
                className={`m-0.5 flex items-center rounded px-2 py-1 transition-colors
                ${viewMode === 'chart' ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setManualViewMode('chart')}>
                <LuChartBar className="mr-1 text-sm" />
                {t('chart.view_chart')}
              </button>
              <button
                type="button"
                className={`m-0.5 flex items-center rounded px-2 py-1 transition-colors
                ${viewMode === 'code' ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setManualViewMode('code')}>
                <VscCode className="mr-1 text-sm" />
                {t('chart.view_code')}
              </button>
            </div>

            <Button
              outlined
              onClick={downloadAsPNG}
              title={t('chart.download_png')}
              aria-label={t('chart.download_png')}
              className="cursor-pointer px-2 py-1 text-xs">
              <IoMdDownload className="text-sm" />
              <TbPhoto className="text-lg" />
            </Button>

            <Button
              outlined
              ref={zoomTriggerRef}
              onClick={() => setZoom(true)}
              title={t('chart.zoom')}
              aria-label={t('chart.zoom')}
              className="cursor-pointer px-2 py-1 text-xs">
              <LuExpand className="text-sm" />
            </Button>
          </div>

          <ButtonCopy className="text-gray-400" text={code} />
        </div>

        <div className="relative overflow-hidden">
          {!zoom && (
            <div
              data-testid="chart-panel"
              className={`transition-all duration-200 ${
                viewMode === 'chart'
                  ? 'visible opacity-100'
                  : 'invisible absolute left-0 top-0 h-0 opacity-0'
              }`}>
              <ChartErrorBoundary
                key={code}
                title={t('chart.invalid_data')}
                rawJson={code}>
                <EChartsRenderer
                  rawJson={code}
                  validatedData={parsedChartData.validatedData}
                  sizeLimitReason={parsedChartData.sizeLimitReason}
                  onChartInit={handleMainChartInit}
                />
              </ChartErrorBoundary>
            </div>
          )}
          {!zoom && (
            <div
              data-testid="code-panel"
              className={`transition-all duration-200 ${
                viewMode === 'code'
                  ? 'visible opacity-100'
                  : 'invisible absolute left-0 top-0 h-0 opacity-0'
              }`}>
              {manualViewMode === null && code.trim() === '' && (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  {t('chart.loading')}
                </div>
              )}
              {codeEverShown && (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language="json"
                  customStyle={{
                    margin: 0,
                    borderRadius: '0 0 0.5rem 0.5rem',
                  }}>
                  {code}
                </SyntaxHighlighter>
              )}
            </div>
          )}
        </div>
      </div>

      <ChartZoomModal
        open={zoom}
        onClose={handleClose}
        code={code}
        validatedData={parsedChartData.validatedData}
        sizeLimitReason={parsedChartData.sizeLimitReason}
        onChartInit={handleZoomChartInit}
      />
    </>
  );
});
