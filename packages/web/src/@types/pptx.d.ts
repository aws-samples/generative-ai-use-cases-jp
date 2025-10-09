export interface PptxTemplate {
  template_id: string;
  tenant_id: string;
  user_id: string;
  template_name: string;
  template_description?: string;
  s3_key: string;
  thumbnail_s3_key?: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PptxTemplateInput {
  template_name: string;
  template_description?: string;
  is_public: boolean;
  tags?: string[];
}

export interface PptxPresignedUrl {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface SlideContent {
  slide_number: number;
  title: string;
  content: string;
  layout: string;
  notes?: string;
}

export interface PptxGeneration {
  generation_id: string;
  user_id: string;
  chat_id?: string;
  template_id?: string;
  status: 'generating' | 'completed' | 'failed';
  s3_output_key?: string;
  download_url?: string;
  error_message?: string;
  slides?: SlideContent[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface PptxGenerationInput {
  template_id?: string;
  chat_id?: string;
  instructions: string;
  slide_count?: number;
  include_title_slide?: boolean;
  include_summary_slide?: boolean;
  model_id?: string;
}

export interface PptxGenerationStatus {
  generation_id: string;
  status: 'generating' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  download_url?: string;
  error_message?: string;
}

export interface PptxTemplateListResponse {
  templates: PptxTemplate[];
  total_count: number;
  has_more: boolean;
}

export interface PptxGenerationListResponse {
  generations: PptxGeneration[];
  total_count: number;
  has_more: boolean;
}