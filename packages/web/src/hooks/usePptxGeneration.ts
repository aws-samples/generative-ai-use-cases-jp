import { useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import useHttp from './useHttp';
import {
  PptxGeneration,
  PptxGenerationInput,
  PptxGenerationStatus,
  PptxGenerationListResponse,
} from '../@types/pptx';

export const usePptxGeneration = () => {
  const http = useHttp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePptx = useCallback(
    async (input: PptxGenerationInput): Promise<PptxGeneration | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await http.post<PptxGeneration>(
          'pptx/generate',
          input
        );
        return response.data;
      } catch (err: unknown) {
        if (isAxiosError<{ detail?: string }>(err)) {
          setError(err.response?.data?.detail || 'Failed to generate PPTX');
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to generate PPTX');
        } else {
          setError('Failed to generate PPTX');
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [http]
  );

  const checkGenerationStatus = useCallback(
    async (generationId: string): Promise<PptxGenerationStatus | null> => {
      try {
        const response = await http.api.get<PptxGenerationStatus>(
          `pptx/generation/${generationId}`
        );
        return response.data ?? null;
      } catch (err: unknown) {
        if (isAxiosError<{ detail?: string }>(err)) {
          setError(
            err.response?.data?.detail || 'Failed to check generation status'
          );
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to check generation status');
        } else {
          setError('Failed to check generation status');
        }
        return null;
      }
    },
    [http]
  );

  const downloadPptx = useCallback(
    async (generationId: string): Promise<void> => {
      try {
        const response = await http.api.get<{ download_url: string }>(
          `pptx/download/${generationId}`
        );

        // Open download URL in new tab
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
        }
      } catch (err: unknown) {
        if (isAxiosError<{ detail?: string }>(err)) {
          setError(err.response?.data?.detail || 'Failed to download PPTX');
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to download PPTX');
        } else {
          setError('Failed to download PPTX');
        }
      }
    },
    [http]
  );

  const listGenerations = useCallback(
    async (
      limit = 20,
      offset = 0
    ): Promise<PptxGenerationListResponse | null> => {
      try {
        const response = await http.api.get<PptxGenerationListResponse>(
          `pptx/generation?limit=${limit}&offset=${offset}`
        );
        return response.data ?? null;
      } catch (err: unknown) {
        if (isAxiosError<{ detail?: string }>(err)) {
          setError(err.response?.data?.detail || 'Failed to list generations');
        } else if (err instanceof Error) {
          setError(err.message || 'Failed to list generations');
        } else {
          setError('Failed to list generations');
        }
        return null;
      }
    },
    [http]
  );

  return {
    generatePptx,
    checkGenerationStatus,
    downloadPptx,
    listGenerations,
    isGenerating,
    error,
  };
};
