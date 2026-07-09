import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoIosClose } from 'react-icons/io';
import type * as echarts from 'echarts';

import EChartsRenderer from './EChartsRenderer';
import { type ValidatedData } from './chart-options';

interface ChartZoomModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
  validatedData: ValidatedData;
  sizeLimitReason?: string | null;
  onChartInit?: (instance: echarts.ECharts | null) => void;
}

export const ChartZoomModal = ({
  open,
  onClose,
  code,
  validatedData,
  sizeLimitReason,
  onChartInit,
}: ChartZoomModalProps) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;
    if (!modal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const firstFocusable = modal.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose} />
      <div
        ref={modalRef}
        data-testid="chart-zoom-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('chart.zoom')}
        className="fixed left-1/2 top-1/2 z-[110] flex h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-white">
        <div className="flex h-[40px] justify-end px-2">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}>
            <IoIosClose className="flex h-8 w-8 cursor-pointer content-center justify-center rounded text-lg hover:bg-gray-200" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-8 pb-8">
          <EChartsRenderer
            rawJson={code}
            validatedData={validatedData}
            sizeLimitReason={sizeLimitReason}
            onChartInit={onChartInit}
            containerStyle={{
              width: '100%',
              aspectRatio: '16 / 9',
              maxHeight: 'calc(90vh - 40px - 4rem)',
            }}
          />
        </div>
      </div>
    </>
  );
};
