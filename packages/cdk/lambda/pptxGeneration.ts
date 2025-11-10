import { SQSEvent, SQSRecord } from 'aws-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import PptxGenJS from 'pptxgenjs';
import { getPptxGenerationsTableName, getPptxTemplatesBucketName, getPptxOutputsBucketName } from './pptx/tenantPptxConfig';
import { loadTemplate } from './pptx/pptxService';
import api from './utils/api';
import { Model } from 'generative-ai-use-cases';
import { modelMetadata } from '@generative-ai-use-cases/common';
import { createTenantDynamoDBClientForBackgroundJob } from './utils/tenantDynamoDBClient';
import { createTenantS3ClientForBackgroundJob } from './utils/tenantS3Client';

interface GenerationMessage {
  generation_id: string;
  user_id: string;
  tenant_id: string;
  instructions: string;
  chat_id?: string;
  template_id?: string;
  template_s3_key?: string;
  slide_count?: number;
  include_title_slide?: boolean;
  include_summary_slide?: boolean;
  model_id?: string;
  timestamp: string;
}

interface SlideContent {
  slide_number: number;
  title: string;
  content: string;
  layout: string;
  notes?: string;
}

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log('Processing PPTX generation requests:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    await processGenerationRecord(record);
  }
};

async function generateSlideContentWithAI(
  message: GenerationMessage
): Promise<SlideContent[]> {
  const modelId = message.model_id || 'gemini-2.5-flash';

  // Determine type: if modelId exists in modelMetadata → bedrock, else → liteLlm
  const modelType = modelMetadata[modelId] ? 'bedrock' : 'liteLlm';

  const model: Model = {
    modelId,
    type: modelType,
    ...(modelType === 'bedrock' && {
      region: process.env.MODEL_REGION || 'us-east-1'
    })
  };

  const slideCountInstruction = message.slide_count
    ? `Create exactly ${message.slide_count} content slides.`
    : 'Create an appropriate number of content slides (5-10).';

  const titleSlideInstruction = message.include_title_slide !== false
    ? 'Include a title slide as the first slide.'
    : 'Do not include a title slide.';

  const summarySlideInstruction = message.include_summary_slide
    ? 'Include a summary slide as the last slide.'
    : '';

  const prompt = `Generate a professional presentation based on these instructions:

${message.instructions}

Requirements:
- ${slideCountInstruction}
- ${titleSlideInstruction}
- ${summarySlideInstruction}
- Each content slide should have a clear title and 3-5 bullet points
- Make content concise and professional
- Use proper formatting

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "slide_number": 1,
    "title": "Slide Title",
    "content": "• Point 1\\n• Point 2\\n• Point 3",
    "layout": "content",
    "notes": "Optional speaker notes"
  }
]

For the title slide use layout: "title" and put subtitle in content field.`;

  try {
    const response = await api[model.type].invoke?.(
      model,
      [{ role: 'user', content: prompt }],
      `pptx-gen-${message.generation_id}`
    );

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const slides = JSON.parse(jsonStr) as SlideContent[];

    // Validate and ensure proper structure
    return slides.map((slide, index) => ({
      slide_number: index + 1,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || '',
      layout: slide.layout || 'content',
      notes: slide.notes,
    }));
  } catch (error) {
    console.error('AI generation failed, falling back to manual extraction:', error);
    // Fallback to manual extraction
    return extractSlidesFromInstructions(message);
  }
}

async function processGenerationRecord(record: SQSRecord): Promise<void> {
  try {
    const message: GenerationMessage = JSON.parse(record.body);
    console.log('Processing generation:', message.generation_id);

    await updateGenerationStatus(message.generation_id, message.user_id, message.tenant_id, 'generating');

    // Extract slide content from instructions using AI if model_id is provided
    const slides = message.model_id
      ? await generateSlideContentWithAI(message)
      : extractSlidesFromInstructions(message);

    // Load template if provided
    let templateBuffer: Buffer | undefined;
    if (message.template_s3_key) {
      templateBuffer = await loadTemplate(message.tenant_id, message.template_s3_key);
    }

    // Generate PPTX
    const pptxBuffer = await generatePptx(slides, templateBuffer);

    // Upload to S3
    const outputKey = `outputs/${message.tenant_id}/${message.user_id}/${message.generation_id}.pptx`;
    await uploadPptx(message.tenant_id, outputKey, pptxBuffer);

    // Update generation status to completed
    await updateGenerationStatus(
      message.generation_id,
      message.user_id,
      message.tenant_id,
      'completed',
      outputKey,
      undefined,
      slides
    );

    console.log('Completed generation:', message.generation_id);

  } catch (error) {
    console.error('Failed to process generation:', error);

    const message: GenerationMessage = JSON.parse(record.body);
    await updateGenerationStatus(
      message.generation_id,
      message.user_id,
      message.tenant_id,
      'failed',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

function extractSlidesFromInstructions(message: GenerationMessage): SlideContent[] {
  const slides: SlideContent[] = [];
  let currentSlideNumber = 1;

  // Add title slide if requested
  if (message.include_title_slide !== false) {
    const titleLines = message.instructions.split('\n').filter(line => line.trim());
    const title = titleLines[0] || 'Presentation';
    const subtitle = titleLines[1] || 'Generated with AI';

    slides.push({
      slide_number: currentSlideNumber,
      title,
      content: subtitle,
      layout: 'title',
    });
    currentSlideNumber++;
  }

  // Parse instructions to extract slide content
  const lines = message.instructions.split('\n');
  let currentSlideTitle = '';
  let currentSlideContent: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if line looks like a slide title
    const isSlideTitle = 
      trimmedLine.startsWith('#') ||
      (trimmedLine.length < 50 && trimmedLine.endsWith(':')) ||
      trimmedLine.toLowerCase().startsWith('slide ');

    if (isSlideTitle) {
      // Save previous slide if we have content
      if (currentSlideTitle && currentSlideContent.length > 0) {
        slides.push({
          slide_number: currentSlideNumber,
          title: currentSlideTitle,
          content: currentSlideContent.join('\n'),
          layout: 'content',
        });
        currentSlideNumber++;
      }

      // Start new slide
      currentSlideTitle = trimmedLine.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      currentSlideContent = [];
    } else {
      // Add to current slide content
      currentSlideContent.push(trimmedLine);
    }
  }

  // Add final slide if we have content
  if (currentSlideTitle && currentSlideContent.length > 0) {
    slides.push({
      slide_number: currentSlideNumber,
      title: currentSlideTitle,
      content: currentSlideContent.join('\n'),
      layout: 'content',
    });
    currentSlideNumber++;
  }

  // If no slides were extracted, create a single content slide
  if (slides.length === (message.include_title_slide !== false ? 1 : 0)) {
    slides.push({
      slide_number: currentSlideNumber,
      title: 'Content',
      content: message.instructions,
      layout: 'content',
    });
    currentSlideNumber++;
  }

  // Add summary slide if requested
  if (message.include_summary_slide) {
    const summaryPoints = [
      '• Key points covered in this presentation',
      '• Important takeaways',
      '• Next steps',
    ];

    slides.push({
      slide_number: currentSlideNumber,
      title: 'Summary',
      content: summaryPoints.join('\n'),
      layout: 'content',
    });
  }

  // Limit to requested slide count if specified
  if (message.slide_count && slides.length > message.slide_count) {
    return slides.slice(0, message.slide_count);
  }

  return slides;
}

async function generatePptx(slides: SlideContent[], templateBuffer?: Buffer): Promise<Buffer> {
  console.log('Generating PPTX with', slides.length, 'slides');

  const pptx = new PptxGenJS();

  // Apply template if provided
  if (templateBuffer) {
    // Note: PptxGenJS doesn't directly support loading from buffer
    // In a production environment, you might need to save to temp file first
    console.log('Template provided but loading from buffer not directly supported');
  }

  // Configure presentation properties
  pptx.author = 'AI Assistant';
  pptx.company = 'Generated Presentations';
  pptx.subject = 'AI Generated Presentation';
  pptx.title = slides.find(s => s.layout === 'title')?.title || 'Presentation';

  // Generate slides
  for (const slideData of slides) {
    const slide = pptx.addSlide();

    if (slideData.layout === 'title') {
      // Title slide layout
      slide.addText(slideData.title, {
        x: 0.5,
        y: 2.0,
        w: 9.0,
        h: 1.5,
        fontSize: 44,
        fontFace: 'Arial',
        color: '363636',
        align: 'center',
        bold: true,
      });

      slide.addText(slideData.content, {
        x: 0.5,
        y: 3.5,
        w: 9.0,
        h: 1.0,
        fontSize: 24,
        fontFace: 'Arial',
        color: '666666',
        align: 'center',
      });
    } else {
      // Content slide layout
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.5,
        w: 9.0,
        h: 1.0,
        fontSize: 32,
        fontFace: 'Arial',
        color: '363636',
        bold: true,
      });

      // Split content into bullet points if it contains line breaks
      const contentLines = slideData.content.split('\n').filter(line => line.trim());

      if (contentLines.length > 1) {
        // Multi-line content as bullet points
        const bulletPoints = contentLines.map(line => {
          const trimmed = line.trim();
          const text = trimmed.startsWith('•') || trimmed.startsWith('-')
            ? trimmed.slice(1).trim()
            : trimmed;
          return { text };
        });

        slide.addText(bulletPoints, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          h: 5.0,
          fontSize: 18,
          fontFace: 'Arial',
          color: '363636',
          bullet: true,
        });
      } else {
        // Single paragraph content
        slide.addText(slideData.content, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          h: 5.0,
          fontSize: 18,
          fontFace: 'Arial',
          color: '363636',
        });
      }
    }

    // Add slide notes if provided
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  // Generate the PPTX file as buffer
  const pptxData = await pptx.write({ outputType: 'nodebuffer' });
  // pptxData is guaranteed to be Buffer when outputType is 'nodebuffer'
  return Buffer.isBuffer(pptxData) ? pptxData : Buffer.from(pptxData as Uint8Array);
}

async function uploadPptx(tenantId: string, s3Key: string, buffer: Buffer): Promise<void> {
  const bucket = await getPptxOutputsBucketName(tenantId);

  console.log('Uploading PPTX to:', { bucket, s3Key, tenantId });

  // Create tenant-specific S3 client for cross-account access
  const s3Client = await createTenantS3ClientForBackgroundJob(tenantId);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ContentDisposition: 'attachment; filename="presentation.pptx"',
  });

  await s3Client.send(command);
}

async function updateGenerationStatus(
  generationId: string,
  userId: string,
  tenantId: string,
  status: string,
  s3OutputKey?: string,
  errorMessage?: string,
  slides?: SlideContent[]
): Promise<void> {
  console.log('Updating generation status:', generationId, status);

  // Create tenant-specific DynamoDB client for cross-account access
  const dynamoClient = await createTenantDynamoDBClientForBackgroundJob(tenantId);
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
  };

  if (s3OutputKey) {
    updateExpression += ', s3OutputKey = :s3OutputKey';
    expressionAttributeValues[':s3OutputKey'] = s3OutputKey;
  }

  if (errorMessage) {
    updateExpression += ', errorMessage = :errorMessage';
    expressionAttributeValues[':errorMessage'] = errorMessage;
  }

  if (slides) {
    updateExpression += ', slides = :slides';
    expressionAttributeValues[':slides'] = slides;
  }

  const command = new UpdateCommand({
    TableName: getPptxGenerationsTableName(tenantId),
    Key: {
      generationId,
      userId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  await docClient.send(command);
}