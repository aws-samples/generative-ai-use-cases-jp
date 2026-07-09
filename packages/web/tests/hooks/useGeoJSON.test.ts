import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getMapKey } from '../../src/components/ECharts/chart-options/map-utils';
import { useGeoJSON } from '../../src/hooks/useGeoJSON';

vi.mock('echarts', () => ({ registerMap: vi.fn(), getMap: vi.fn(() => null) }));

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getMapKey', () => {
  it('returns world for world region', () => {
    expect(getMapKey('world')).toBe('world');
    expect(getMapKey('world', 'prefecture')).toBe('world');
  });

  it('returns japan-prefecture for japan with prefecture detail', () => {
    expect(getMapKey('japan', 'prefecture')).toBe('japan-prefecture');
  });

  it('returns japan for japan without detail', () => {
    expect(getMapKey('japan')).toBe('japan');
    expect(getMapKey('japan', undefined)).toBe('japan');
  });

  it('returns japan-municipality-{prefecture} for municipality detail', () => {
    expect(getMapKey('japan', 'municipality', '13')).toBe(
      'japan-municipality-13'
    );
  });
});

describe('useGeoJSON', () => {
  it('fetches japan-prefectures.geojson for japan prefecture detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    });

    const { result } = renderHook(() => useGeoJSON('japan', 'prefecture'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/geojson/japan-prefectures.geojson',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('fetches world-countries.geojson for world region', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    });

    const { result } = renderHook(() => useGeoJSON('world'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/geojson/world-countries.geojson',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('fetches municipality geojson for japan municipality detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    });

    const { result } = renderHook(() =>
      useGeoJSON('japan', 'municipality', '13')
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/geojson/japan-municipalities/13.geojson',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('aborts in-flight fetch on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementation((_url, init) => {
        capturedSignal = (init as RequestInit).signal as AbortSignal;
        return new Promise(() => {}); // permanently pending
      });
    const { unmount } = renderHook(() => useGeoJSON('japan', 'prefecture'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('returns load_failed discriminator on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);
    const { result } = renderHook(() => useGeoJSON('world'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('load_failed');
  });

  it('returns load_failed when response JSON lacks features array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'not found' }),
    });
    const { result } = renderHook(() => useGeoJSON('world'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('load_failed');
  });

  it('does not call registerMap when signal is aborted after response.json()', async () => {
    const { registerMap } = await import('echarts');
    vi.mocked(registerMap).mockClear();

    let resolveJson!: (v: unknown) => void;
    const jsonPromise = new Promise((res) => {
      resolveJson = res;
    });

    let capturedSignal: AbortSignal | undefined;
    mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal;
      return Promise.resolve({ ok: true, json: () => jsonPromise });
    });

    const { unmount } = renderHook(() => useGeoJSON('japan', 'prefecture'));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    // Abort before json resolves
    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    // Now resolve json — registerMap must NOT be called
    resolveJson({ type: 'FeatureCollection', features: [] });
    await new Promise((r) => setTimeout(r, 0));

    expect(registerMap).not.toHaveBeenCalled();
  });
});
