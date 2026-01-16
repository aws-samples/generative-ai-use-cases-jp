import { useState } from 'react';
import { isAxiosError } from 'axios';
import useHttp from './useHttp';
import {
  PptxTemplate,
  PptxTemplateInput,
  PptxTemplateListResponse,
  PptxPresignedUrl,
} from '../@types/pptx';

export const usePptxTemplates = () => {
  const http = useHttp();
  const [templates, setTemplates] = useState<PptxTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async (
    includePublic = true,
    userOnly = false
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await http.api.get<PptxTemplateListResponse>(
        `pptx/template?include_public=${includePublic}&user_only=${userOnly}&limit=100`
      );
      if (response.data?.templates) {
        setTemplates(response.data.templates);
      }
    } catch (err: unknown) {
      if (isAxiosError<{ detail?: string }>(err)) {
        setError(err.response?.data?.detail || 'Failed to load templates');
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to load templates');
      } else {
        setError('Failed to load templates');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadTemplate = async (
    file: File,
    templateData: PptxTemplateInput
  ): Promise<boolean> => {
    setError(null);

    try {
      // Normalize Content-Type based on file extension
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'));
      const contentType =
        fileExtension === '.potx'
          ? 'application/vnd.openxmlformats-officedocument.presentationml.template'
          : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      // Step 1: Get presigned URL for upload
      const urlResponse = await http.api.post<PptxPresignedUrl>(
        `pptx/template/upload-url?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(contentType)}`,
        {}
      );

      const { upload_url, s3_key } = urlResponse.data;

      // Step 2: Upload file to S3 with normalized Content-Type
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) {
        // Capture detailed S3 error information
        const errorText = await uploadResponse.text();
        console.error('S3 upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          headers: Object.fromEntries(uploadResponse.headers.entries()),
          body: errorText,
          contentType,
          fileSize: file.size,
          fileName: file.name,
        });

        throw new Error(
          `Failed to upload file to S3: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText || 'No error details available'}`
        );
      }

      // Step 3: Register template
      await http.api.post<PptxTemplate>(
        `pptx/template?s3_key=${encodeURIComponent(s3_key)}`,
        templateData
      );

      return true;
    } catch (err: unknown) {
      if (isAxiosError<{ detail?: string }>(err)) {
        setError(err.response?.data?.detail || 'Failed to upload template');
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to upload template');
      } else {
        setError('Failed to upload template');
      }
      return false;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    setError(null);

    try {
      await http.api.delete(`pptx/template/${templateId}`);

      // Remove from local state
      setTemplates((prev) => prev.filter((t) => t.template_id !== templateId));

      return true;
    } catch (err: unknown) {
      if (isAxiosError<{ detail?: string }>(err)) {
        setError(err.response?.data?.detail || 'Failed to delete template');
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to delete template');
      } else {
        setError('Failed to delete template');
      }
      return false;
    }
  };

  return {
    templates,
    loadTemplates,
    uploadTemplate,
    deleteTemplate,
    isLoading,
    error,
  };
};
