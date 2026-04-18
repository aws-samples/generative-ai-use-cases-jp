import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { VscCode } from 'react-icons/vsc';
import { LuImage } from 'react-icons/lu';
import { IoIosClose, IoMdDownload } from 'react-icons/io';
import { TbSvg, TbPng } from 'react-icons/tb';

import ButtonCopy from '../ButtonCopy';
import Button from '../Button';

import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// SVG preview component using img tag for security
interface SvgPreviewProps {
  code: string;
  handler?: () => void;
}

const SvgPreview: React.FC<SvgPreviewProps> = ({ code, handler }) => {
  const { t } = useTranslation();
  const [dataUri, setDataUri] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      try {
        // Validate that it's a valid SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, 'image/svg+xml');
        const parseError = doc.querySelector('parsererror');

        if (parseError) {
          setError(t('svg.invalid_syntax'));
          setDataUri('');
          return;
        }

        // Create data URI for safe rendering via img tag
        const encoded = encodeURIComponent(code);
        setDataUri(`data:image/svg+xml,${encoded}`);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(t('svg.invalid_syntax'));
        setDataUri('');
      }
    }
  }, [code, t]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-red-500">
        {error}
      </div>
    );
  }

  return code && dataUri ? (
    <div
      onClick={handler}
      className="flex h-full w-full cursor-pointer content-center items-center justify-center bg-white px-3 py-2 duration-700">
      <img
        src={dataUri}
        alt={t('svg.preview_alt')}
        className="max-h-full max-w-full border border-gray-200 object-contain"
        draggable={false}
      />
    </div>
  ) : null;
};

// SVG with toggle component (preview/code view with download)
interface SvgWithToggleProps {
  code: string;
}

export const SvgWithToggle = memo(({ code }: SvgWithToggleProps) => {
  const { t } = useTranslation();
  // Start with 'code' view during streaming, auto-switch to 'preview' when stable
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('code');
  const [zoom, setZoom] = useState(false);
  const prevCodeRef = useRef(code);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-switch to preview view when code becomes stable (no changes for 500ms)
  useEffect(() => {
    // If code has changed
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // If no changes for 500ms, consider it stable and switch to preview
      timerRef.current = setTimeout(() => {
        setViewMode('preview');
      }, 500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [code]);

  // Handle escape key for zoom
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZoom(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Download as SVG
  const downloadAsSVG = useCallback(() => {
    try {
      const blob = new Blob([code], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `svg_${new Date().getTime()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(t('svg.svg_error'), error);
    }
  }, [code, t]);

  // Download as PNG
  const downloadAsPNG = useCallback(async () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      if (!(svgElement instanceof SVGSVGElement)) return;

      // Get dimensions from SVG
      const viewBox = svgElement
        .getAttribute('viewBox')
        ?.split(' ')
        .map(Number) || [0, 0, 0, 0];
      const width = Math.max(
        svgElement.width?.baseVal?.value || 0,
        viewBox[2],
        300
      );
      const height = Math.max(
        svgElement.height?.baseVal?.value || 0,
        viewBox[3],
        300
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Wrap SVG with white background
      const wrappedSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="white"/>
          ${code}
        </svg>
      `;

      const svgBase64 = btoa(unescape(encodeURIComponent(wrappedSvg)));
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + svgBase64;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      const link = document.createElement('a');
      link.download = `svg_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error(t('svg.png_error'), error);
    }
  }, [code, t]);

  return (
    <>
      <div className="my-4 rounded-lg border border-gray-200 bg-white">
        {/* Toggle header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex cursor-pointer rounded border bg-gray-50 text-xs font-bold">
              <div
                className={`m-0.5 flex items-center rounded px-2 py-1 transition-colors
                ${viewMode === 'preview' ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setViewMode('preview')}>
                <LuImage className="mr-1 text-sm" />
                {t('svg.show_preview')}
              </div>
              <div
                className={`m-0.5 flex items-center rounded px-2 py-1 transition-colors
                ${viewMode === 'code' ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setViewMode('code')}>
                <VscCode className="mr-1 text-sm" />
                {t('svg.show_code')}
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex gap-1">
              <Button
                outlined
                onClick={downloadAsSVG}
                title={t('svg.download_as_svg')}
                className="cursor-pointer px-2 py-1 text-xs">
                <IoMdDownload className="text-sm" />
                <TbSvg className="text-lg" />
              </Button>
              <Button
                outlined
                onClick={downloadAsPNG}
                title={t('svg.download_as_png')}
                className="cursor-pointer px-2 py-1 text-xs">
                <IoMdDownload className="text-sm" />
                <TbPng className="text-lg" />
              </Button>
            </div>
          </div>

          <ButtonCopy className="text-gray-400" text={code} />
        </div>

        {/* Content area */}
        <div className="relative overflow-hidden">
          <div
            className={`transition-all duration-200 ${
              viewMode === 'preview'
                ? 'visible opacity-100'
                : 'invisible absolute left-0 top-0 h-0 opacity-0'
            }`}>
            <SvgPreview code={code} handler={() => setZoom(true)} />
          </div>
          <div
            className={`transition-all duration-200 ${
              viewMode === 'code'
                ? 'visible opacity-100'
                : 'invisible absolute left-0 top-0 h-0 opacity-0'
            }`}>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language="xml"
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.5rem 0.5rem',
              }}>
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      {zoom && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/50"
            onClick={() => setZoom(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[110] flex h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex h-[40px] justify-end px-2">
              <button onClick={() => setZoom(false)}>
                <IoIosClose className="flex h-8 w-8 cursor-pointer content-center justify-center rounded text-lg hover:bg-gray-200" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-8 pb-8">
              <SvgPreview code={code} />
            </div>
          </div>
        </>
      )}
    </>
  );
});
