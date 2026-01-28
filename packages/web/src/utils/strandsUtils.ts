/**
 * Utility functions for converting between Strands and GenU formats
 */

import {
  ExtraData,
  Metadata,
  StrandsContentBlock,
  StrandsMessage,
  StrandsRole,
  StrandsStreamEvent,
  UnrecordedMessage,
  UploadedFileType,
} from 'generative-ai-use-cases';

/**
 * Convert GenU messages to Strands format
 */
export const convertToStrandsFormat = (
  messages: UnrecordedMessage[],
  uploadedFiles?: UploadedFileType[],
  base64Cache?: Record<string, string>
): StrandsMessage[] => {
  console.log('convertToStrandsFormat', uploadedFiles, base64Cache);
  return messages.map((message) => {
    const contentBlocks: StrandsContentBlock[] = [];

    // Add text content if present
    if (message.content && message.content.trim()) {
      contentBlocks.push({ text: message.content });
    }

    // Convert extraData to Strands content blocks
    if (message.extraData) {
      for (const data of message.extraData) {
        const contentBlock = convertExtraDataToStrandsContentBlock(
          data,
          uploadedFiles,
          base64Cache
        );
        if (contentBlock) {
          contentBlocks.push(contentBlock);
        }
      }
    }

    // Ensure at least one content block exists
    if (contentBlocks.length === 0) {
      contentBlocks.push({ text: message.content || '' });
    }

    return {
      role: message.role as StrandsRole,
      content: contentBlocks,
    };
  });
};

/**
 * Convert ExtraData to Strands content block
 */
const convertExtraDataToStrandsContentBlock = (
  data: ExtraData,
  uploadedFiles?: UploadedFileType[],
  base64Cache?: Record<string, string>
): StrandsContentBlock | null => {
  let base64Data: string | undefined;

  // Get base64 data based on source type
  if (data.source.type === 'base64') {
    base64Data = data.source.data;
  } else if (data.source.type === 's3') {
    // Try to find base64 data from uploadedFiles or base64Cache
    base64Data =
      uploadedFiles
        ?.find((uploadedFile) => uploadedFile.s3Url === data.source.data)
        ?.base64EncodedData?.replace(/^data:(.*,)?/, '') ??
      base64Cache?.[data.source.data]?.replace(/^data:(.*,)?/, '');
  }

  if (!base64Data) {
    console.warn('No base64 data found for extraData:', data);
    return null;
  }

  // Convert based on data type
  switch (data.type) {
    case 'image':
      return {
        image: {
          format: getImageFormatFromMimeType(data.source.mediaType),
          source: {
            bytes: base64Data,
          },
        },
      };

    case 'file':
      return {
        document: {
          format: getDocumentFormatFromMimeType(data.source.mediaType),
          name: data.name,
          source: {
            bytes: base64Data,
          },
        },
      };

    default:
      console.warn('Unsupported extraData type:', data.type);
      return null;
  }
};

/**
 * Get image format from MIME type
 */
const getImageFormatFromMimeType = (
  mimeType?: string
): 'png' | 'jpeg' | 'gif' | 'webp' => {
  if (!mimeType) return 'png';

  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
};

/**
 * Get document format from MIME type
 */
const getDocumentFormatFromMimeType = (
  mimeType?: string
): 'pdf' | 'csv' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'html' | 'txt' | 'md' => {
  if (!mimeType) return 'txt';

  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('csv')) return 'csv';
  if (mimeType.includes('msword') || mimeType.includes('.document'))
    return 'doc';
  if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  )
    return 'docx';
  if (mimeType.includes('ms-excel') || mimeType.includes('.sheet'))
    return 'xls';
  if (
    mimeType.includes('spreadsheetml') ||
    mimeType.includes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  )
    return 'xlsx';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('markdown')) return 'md';
  return 'txt';
};

/**
 * Convert uploaded files to Strands content blocks
 */
export const convertFilesToStrandsContentBlocks = async (
  files: File[]
): Promise<StrandsContentBlock[]> => {
  const contentBlocks: StrandsContentBlock[] = [];

  for (const file of files) {
    try {
      const base64Data = await fileToBase64(file);

      // Determine if it's an image or document
      if (file.type.startsWith('image/')) {
        contentBlocks.push({
          image: {
            format: getImageFormatFromMimeType(file.type),
            source: {
              bytes: base64Data,
            },
          },
        });
      } else {
        contentBlocks.push({
          document: {
            format: getDocumentFormatFromMimeType(file.type),
            name: file.name,
            source: {
              bytes: base64Data,
            },
          },
        });
      }
    } catch (error) {
      console.error(`Error converting file ${file.name}:`, error);
    }
  }

  return contentBlocks;
};

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Convert Strands messages back to GenU format
 */
export const convertFromStrandsFormat = (
  messages: StrandsMessage[]
): UnrecordedMessage[] => {
  return messages.map((message) => {
    // Extract text content from content blocks
    const textContent = message.content
      .filter((block) => 'text' in block)
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    // Extract extra data from non-text content blocks
    const extraData: ExtraData[] = [];
    for (const block of message.content) {
      if ('image' in block && block.image.source) {
        extraData.push({
          type: 'image',
          name: 'image', // Default name for images
          source: {
            type: 'base64',
            mediaType: `image/${block.image.format}`,
            data: block.image.source.bytes,
          },
        });
      } else if ('document' in block && block.document.source) {
        extraData.push({
          type: 'file',
          name: block.document.name || 'document',
          source: {
            type: 'base64',
            mediaType: getDocumentMimeType(block.document.format || 'txt'),
            data: block.document.source.bytes,
          },
        });
      }
    }

    return {
      role: message.role,
      content: textContent,
      extraData: extraData.length > 0 ? extraData : undefined,
    };
  });
};

/**
 * Get MIME type from document format
 */
const getDocumentMimeType = (
  format:
    | 'pdf'
    | 'csv'
    | 'doc'
    | 'docx'
    | 'xls'
    | 'xlsx'
    | 'html'
    | 'txt'
    | 'md'
): string => {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    html: 'text/html',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  return mimeTypes[format] || 'application/octet-stream';
};

/**
 * Content block types for state tracking
 */
type ContentBlockType = 'text' | 'toolUse' | 'reasoning' | null;

/**
 * Stateful stream processor for Strands events
 */
export class StrandsStreamProcessor {
  private currentContentBlockType: ContentBlockType = null;
  private toolUseBuffer: string = '';
  private textBuffer: string = ''; // Text buffer for research agent
  private isResearchAgent: boolean = false; // Flag to identify research agent

  /**
   * Set whether this is a research agent request
   */
  setResearchAgent(isResearch: boolean): void {
    this.isResearchAgent = isResearch;
  }

  /**
   * Process a streaming event and return formatted content
   */
  processEvent(
    eventText: string
  ): { text: string; trace?: string; metadata?: Metadata } | null {
    try {
      const parsedEvent = JSON.parse(eventText);
      const streamEvent = parsedEvent.event as StrandsStreamEvent;

      if (!streamEvent) return null;

      // Handle message start event
      if (streamEvent.messageStart) {
        this.reset();
        return null;
      }

      // Handle content block start event
      if (streamEvent.contentBlockStart) {
        const start = streamEvent.contentBlockStart.start;

        if ('text' in start && start.text) {
          this.currentContentBlockType = 'text';
          // For research agent, buffer text to process <final_report> tags
          if (this.isResearchAgent) {
            this.textBuffer = start.text;
            return null; // Don't return yet, wait for contentBlockStop
          }
          return { text: start.text };
        } else if ('toolUse' in start && start.toolUse) {
          this.currentContentBlockType = 'toolUse';
          this.toolUseBuffer = '';
          return { text: '', trace: `\`\`\`${start.toolUse.name}\n` };
        }
      }

      // Handle content block delta event (incremental updates)
      if (streamEvent.contentBlockDelta) {
        const delta = streamEvent.contentBlockDelta.delta;

        if (delta.text) {
          this.currentContentBlockType = 'text';
          // For research agent, buffer text to process <final_report> tags
          if (this.isResearchAgent) {
            this.textBuffer += delta.text;
            return null; // Don't return yet, wait for contentBlockStop
          }
          return { text: delta.text };
        } else if (delta.toolUse) {
          this.currentContentBlockType = 'toolUse';
          this.toolUseBuffer += delta.toolUse.input;
          return { text: '', trace: delta.toolUse.input };
        } else if (delta.reasoningContent?.text) {
          this.currentContentBlockType = 'reasoning';
          return { text: '', trace: delta.reasoningContent.text };
        }
      }

      // Handle content block stop event
      if (streamEvent.contentBlockStop) {
        if (this.currentContentBlockType === 'text') {
          // For research agent, process buffered text for <final_report> tags
          if (this.isResearchAgent) {
            const bufferedText = this.textBuffer;
            this.textBuffer = '';

            // Check for final_report tags and split content
            if (
              bufferedText.includes('<final_report>') &&
              bufferedText.includes('</final_report>')
            ) {
              // Extract final report (inside tags) → chat
              const reportMatches = bufferedText.match(
                /<final_report>([\s\S]*?)<\/final_report>/g
              );
              let finalReport = '';
              if (reportMatches) {
                finalReport = reportMatches
                  .map((m) =>
                    m
                      .replace('<final_report>', '')
                      .replace('</final_report>', '')
                  )
                  .join('\n');
              }

              // Extract everything else (outside tags) → trace
              const trace = bufferedText
                .replace(/<final_report>[\s\S]*?<\/final_report>/g, '')
                .trim();

              // Return both
              const result: { text: string; trace?: string } = { text: '' };
              if (trace) {
                result.trace = trace;
              }
              if (finalReport) {
                result.text = finalReport;
              }

              this.currentContentBlockType = null;
              return result;
            }

            // No XML tags for research agent, return as trace
            const result = { text: '', trace: bufferedText };
            this.currentContentBlockType = null;
            return result;
          }

          // For non-research agents, return text normally
          const result = { text: '\n' };
          this.currentContentBlockType = null;
          return result;
        } else if (this.currentContentBlockType === 'toolUse') {
          // Close the tool use block
          const result = { text: '', trace: `\n\`\`\`\n` };
          this.currentContentBlockType = null;
          return result;
        }
        this.currentContentBlockType = null;
        return null;
      }

      // Handle message stop event
      if (streamEvent.messageStop) {
        this.reset();
        return null;
      }

      // Handle metadata event
      if (streamEvent.metadata) {
        return {
          text: '',
          metadata: {
            usage: {
              inputTokens: streamEvent.metadata.usage.inputTokens,
              outputTokens: streamEvent.metadata.usage.outputTokens,
              totalTokens: streamEvent.metadata.usage.totalTokens,
              cacheReadInputTokens:
                streamEvent.metadata.usage.cacheReadInputTokens,
              cacheWriteInputTokens:
                streamEvent.metadata.usage.cacheWriteInputTokens,
            },
          },
        };
      }

      // Handle error events
      const errorEvent =
        streamEvent.internalServerException ||
        streamEvent.modelStreamErrorException ||
        streamEvent.serviceUnavailableException ||
        streamEvent.throttlingException ||
        streamEvent.validationException;

      if (errorEvent) {
        return {
          text: `Error: ${errorEvent.message || 'An error occurred'}`,
        };
      }

      // Handle redact content event
      if (streamEvent.redactContent) {
        if (streamEvent.redactContent.redactAssistantContentMessage) {
          return {
            text: streamEvent.redactContent.redactAssistantContentMessage,
          };
        }
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error processing Strands event:', error);
      return null;
    }
  }

  /**
   * Reset the processor state
   */
  reset(): void {
    this.currentContentBlockType = null;
    this.toolUseBuffer = '';
    this.textBuffer = '';
  }
}
