import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { EChartsWithToggle } from '../../../src/components/ECharts/EChartsWithToggle';

const invalidDataLabel = 'chart.invalid_data';

const mockChartInstance = {
  getDataURL: vi.fn(() => 'data:image/png;base64,chart'),
  resize: vi.fn(),
  dispose: vi.fn(),
  setOption: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('copy-to-clipboard', () => ({
  default: () => true,
  __esModule: true,
}));

vi.mock('../../../src/hooks/useInterUseCases', () => ({
  default: () => ({
    setCopyTemporary: vi.fn(),
  }),
  __esModule: true,
}));

vi.mock('../../../src/components/ECharts/EChartsRenderer', () => {
  function MockEChartsRenderer({
    onChartInit,
  }: {
    onChartInit?: (instance: unknown) => void;
  }) {
    useEffect(() => {
      onChartInit?.(mockChartInstance);
      return () => {
        onChartInit?.(null);
      };
    }, [onChartInit]);

    return (
      <div data-testid="echarts-renderer">
        <div
          data-testid="echarts-container"
          style={{ width: '100%', height: 300 }}
        />
      </div>
    );
  }
  return {
    default: MockEChartsRenderer,
    ChartAlert: ({ title }: { title: string }) => (
      <div role="alert">{title}</div>
    ),
  };
});

const validBarChartJson = JSON.stringify({
  type: 'bar',
  title: 'Test Chart',
  data: [
    { name: 'A', value: 10 },
    { name: 'B', value: 20 },
    { name: 'C', value: 30 },
  ],
});

const validScatterChartJson = JSON.stringify({
  type: 'scatter',
  title: 'Scatter Chart',
  data: [
    { name: 'A', value: [1, 2] },
    { name: 'B', value: [3, 4] },
    { name: 'C', value: [5, 6] },
  ],
});

const invalidJson = 'not valid json {{{';
const invalidChartDataJson = JSON.stringify({ foo: 'bar' });

describe('EChartsWithToggle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockChartInstance.getDataURL.mockClear();
    mockChartInstance.resize.mockClear();
    mockChartInstance.dispose.mockClear();
    mockChartInstance.setOption.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders chart view immediately with valid data', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    expect(screen.getByTestId('chart-panel').className).toContain('visible');
    expect(screen.getByTestId('echarts-renderer')).toBeTruthy();
  });

  it('shows chart view by default when data is valid', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    expect(screen.getByText('chart.view_chart')).toBeTruthy();
    expect(screen.getByText('chart.view_code')).toBeTruthy();
    expect(screen.getByTestId('chart-panel').className).toContain('visible');
  });

  it('toggles to code view on button click', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByText('chart.view_code'));

    expect(screen.getByTestId('code-panel').className).toContain('visible');
  });

  it('toggles back to chart view on button click', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByText('chart.view_code'));
    expect(screen.getByTestId('code-panel').className).toContain('visible');

    fireEvent.click(screen.getByText('chart.view_chart'));

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('chart-panel').className).toContain('visible');
  });

  it('shows code view for invalid JSON', () => {
    render(<EChartsWithToggle code={invalidJson} />);

    expect(screen.getByTestId('code-panel').className).toContain('visible');
  });

  it('does not re-parse JSON on rerender with the same input', () => {
    const parseSpy = vi.spyOn(JSON, 'parse');

    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByText('chart.view_code'));
    fireEvent.click(screen.getByText('chart.view_chart'));

    expect(parseSpy).toHaveBeenCalledTimes(1);

    parseSpy.mockRestore();
  });

  it('renders SVG download button and downloads via chart instance from callback', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByTitle('chart.download_png'));

    expect(mockChartInstance.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it('renders scatter charts without visible labels and keeps zoom/download wiring', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<EChartsWithToggle code={validScatterChartJson} />);

    expect(screen.getByTestId('chart-panel').className).toContain('visible');
    expect(screen.getByTestId('code-panel').className).not.toMatch(
      /(^|\s)visible(\s|$)/
    );
    expect(screen.getByTestId('echarts-renderer')).toBeTruthy();
    expect(screen.queryByText(invalidDataLabel)).toBeNull();

    fireEvent.click(screen.getByTitle('chart.zoom'));

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('chart-zoom-modal')).toBeTruthy();

    fireEvent.click(screen.getByTitle('chart.download_png'));

    expect(mockChartInstance.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it('imports component', () => {
    expect(EChartsWithToggle).toBeDefined();
  });

  it('shows code view for valid json with invalid chart data', () => {
    render(<EChartsWithToggle code={invalidChartDataJson} />);

    expect(screen.getByTestId('code-panel').className).toContain('visible');
  });

  it('opens zoom modal and closes on escape', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByTitle('chart.zoom'));

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('chart-zoom-modal')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('chart-zoom-modal')).toBeNull();
  });

  it('receives chart instance via onChartInit callback from EChartsRenderer', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    expect(mockChartInstance.getDataURL).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('chart.download_png'));

    expect(mockChartInstance.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
  });

  it('uses zoom chart instance for download when zoom modal is open', () => {
    render(<EChartsWithToggle code={validBarChartJson} />);

    fireEvent.click(screen.getByTitle('chart.zoom'));

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId('chart-zoom-modal')).toBeTruthy();

    fireEvent.click(screen.getByTitle('chart.download_png'));

    expect(mockChartInstance.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
  });

  describe('streaming scenarios', () => {
    it('shows loading state when code is empty', () => {
      render(<EChartsWithToggle code="" />);

      expect(screen.getByTestId('code-panel').className).toContain('visible');
      expect(screen.getByText('chart.loading')).toBeTruthy();
    });

    it('switches to chart view when valid data arrives', () => {
      const { rerender } = render(<EChartsWithToggle code="" />);

      expect(screen.getByTestId('code-panel').className).toContain('visible');

      rerender(<EChartsWithToggle code={validBarChartJson} />);

      expect(screen.getByTestId('chart-panel').className).toContain('visible');
      expect(screen.getByTestId('echarts-renderer')).toBeTruthy();
    });

    it('stays in code view when data is invalid JSON', () => {
      render(<EChartsWithToggle code={invalidJson} />);

      expect(screen.getByTestId('code-panel').className).toContain('visible');
    });

    it('stays in code view when data is valid JSON but invalid chart data', () => {
      render(<EChartsWithToggle code={invalidChartDataJson} />);

      expect(screen.getByTestId('code-panel').className).toContain('visible');
    });

    it('manual toggle to chart works with invalid data', () => {
      render(<EChartsWithToggle code={invalidJson} />);

      expect(screen.getByTestId('code-panel').className).toContain('visible');

      fireEvent.click(screen.getByText('chart.view_chart'));

      expect(screen.getByTestId('chart-panel').className).toContain('visible');
    });

    it('manual toggle to code works with valid data', () => {
      render(<EChartsWithToggle code={validBarChartJson} />);

      expect(screen.getByTestId('chart-panel').className).toContain('visible');

      fireEvent.click(screen.getByText('chart.view_code'));

      expect(screen.getByTestId('code-panel').className).toContain('visible');
    });

    it('resets manual override when code changes', () => {
      const { rerender } = render(
        <EChartsWithToggle code={validBarChartJson} />
      );

      fireEvent.click(screen.getByText('chart.view_code'));
      expect(screen.getByTestId('code-panel').className).toContain('visible');

      const newValidData = JSON.stringify({
        type: 'line',
        title: 'New Chart',
        data: [{ name: 'X', value: 100 }],
      });
      rerender(<EChartsWithToggle code={newValidData} />);

      expect(screen.getByTestId('chart-panel').className).toContain('visible');
    });
  });

  describe('exclusive mount on zoom', () => {
    it('unmounts chart-panel when zoom opens', () => {
      render(<EChartsWithToggle code={validBarChartJson} />);

      expect(screen.getByTestId('chart-panel')).toBeTruthy();

      fireEvent.click(screen.getByTitle('chart.zoom'));

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(screen.queryByTestId('chart-panel')).toBeNull();
    });

    it('remounts chart-panel when zoom closes', () => {
      render(<EChartsWithToggle code={validBarChartJson} />);

      fireEvent.click(screen.getByTitle('chart.zoom'));

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(screen.queryByTestId('chart-panel')).toBeNull();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.getByTestId('chart-panel')).toBeTruthy();
    });

    it('chart/code toggle keeps chart-panel mounted (no unmount)', () => {
      const onChartInit = vi.fn();

      vi.doMock('../../../src/components/ECharts/EChartsRenderer', () => {
        function MockEChartsRenderer2({
          onChartInit: cb,
        }: {
          onChartInit?: (instance: unknown) => void;
        }) {
          useEffect(() => {
            cb?.(mockChartInstance);
            return () => {
              cb?.(null);
            };
          }, [cb]);
          return <div data-testid="echarts-renderer" />;
        }
        return { default: MockEChartsRenderer2 };
      });

      render(<EChartsWithToggle code={validBarChartJson} />);

      expect(screen.getByTestId('chart-panel')).toBeTruthy();

      fireEvent.click(screen.getByText('chart.view_code'));

      // chart-panel still in DOM (CSS toggle only)
      expect(screen.getByTestId('chart-panel')).toBeTruthy();
      // onChartInit(null) not called (no unmount)
      expect(onChartInit).not.toHaveBeenCalledWith(null);
    });
  });
});
