import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import Button from '../components/Button';
// import ButtonIcon from '../components/ButtonIcon'; // Unused when template selector is hidden
import Textarea from '../components/Textarea';
import Slider from '../components/Slider';
import Switch from '../components/Switch';
import Select from '../components/Select';
import LoadingWave from '../components/LoadingWave';
import Alert from '../components/Alert';
import { /* PiPlus, */ PiPresentation } from 'react-icons/pi'; // PiPlus unused when template selector is hidden
import { usePptxGeneration } from '../hooks/usePptxGeneration';
import { usePptxTemplates } from '../hooks/usePptxTemplates';
// import PptxTemplateSelector from '../components/PptxTemplateSelector'; // Unused when template selector is hidden
// import PptxTemplateUploader from '../components/PptxTemplateUploader'; // Unused when template selector is hidden
import { PptxTemplate, PptxGeneration } from '../@types/pptx';
import { MODELS } from '../hooks/useModel';

const PptxGenerationPage: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [instructions, setInstructions] = useState('');
  const [selectedTemplate /* , setSelectedTemplate */] =
    useState<PptxTemplate | null>(null); // setSelectedTemplate unused when template selector is hidden
  const [slideCount, setSlideCount] = useState<number>(5);
  const [includeTitleSlide, setIncludeTitleSlide] = useState(true);
  const [includeSummarySlide, setIncludeSummarySlide] = useState(false);
  const [selectedModelId, setSelectedModelId] =
    useState<string>('gemini-2.5-flash');
  // const [showTemplateUploader, setShowTemplateUploader] = useState(false); // Unused when template selector is hidden
  const [currentGeneration, setCurrentGeneration] =
    useState<PptxGeneration | null>(null);

  // Hooks
  const {
    generatePptx,
    checkGenerationStatus,
    downloadPptx,
    isGenerating,
    error: generationError,
  } = usePptxGeneration();

  const {
    // templates,
    // loadTemplates,
    // uploadTemplate,
    // isLoading: templatesLoading,
    error: templatesError, // Keep for error display
  } = usePptxTemplates(); // Mostly unused when template selector is hidden

  // Model utilities
  const { textModels, modelDisplayName } = MODELS;
  const availableModels = textModels.map((m) => m.modelId);

  // Load templates on mount - COMMENTED OUT when template selector is hidden
  // useEffect(() => {
  //   loadTemplates();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // Poll generation status if we have an active generation
  useEffect(() => {
    if (currentGeneration && currentGeneration.status === 'generating') {
      const interval = setInterval(async () => {
        const status = await checkGenerationStatus(
          currentGeneration.generation_id
        );
        if (status) {
          // Update current generation with status information
          setCurrentGeneration((prev) =>
            prev
              ? {
                  ...prev,
                  status: status.status,
                  s3_output_key: status.download_url
                    ? 'completed'
                    : prev.s3_output_key,
                  download_url: status.download_url,
                  error_message: status.error_message,
                  updated_at: new Date().toISOString(),
                }
              : null
          );
          if (status.status !== 'generating') {
            clearInterval(interval);
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentGeneration, checkGenerationStatus]);

  const handleGeneratePptx = useCallback(async () => {
    if (!instructions.trim() || isGenerating) {
      return;
    }

    const generation = await generatePptx({
      instructions: instructions.trim(),
      template_id: selectedTemplate?.template_id,
      slide_count: slideCount,
      include_title_slide: includeTitleSlide,
      include_summary_slide: includeSummarySlide,
      model_id: selectedModelId,
    });

    if (generation) {
      setCurrentGeneration(generation);
    }
  }, [
    instructions,
    selectedTemplate,
    slideCount,
    includeTitleSlide,
    includeSummarySlide,
    selectedModelId,
    generatePptx,
    isGenerating,
  ]);

  const handleDownload = useCallback(async () => {
    if (currentGeneration && currentGeneration.status === 'completed') {
      await downloadPptx(currentGeneration.generation_id);
    }
  }, [currentGeneration, downloadPptx]);

  // Unused when template selector is hidden
  // const handleTemplateUpload = useCallback(async (file: File, templateData: any) => {
  //   const success = await uploadTemplate(file, templateData);
  //   if (success) {
  //     setShowTemplateUploader(false);
  //     loadTemplates(); // Refresh templates list
  //   }
  // }, [uploadTemplate, loadTemplates]);

  const isDisabled = !instructions.trim() || isGenerating;
  const error = generationError || templatesError;

  return (
    <div className="mx-4 my-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-aws-smile/10 flex h-16 w-16 items-center justify-center rounded-full">
              <PiPresentation className="text-aws-smile h-8 w-8" />
            </div>
          </div>
          <h1 className="text-aws-font-color mb-2 text-3xl font-bold">
            {t('pptx.title')}
          </h1>
          <p className="text-aws-font-color-secondary">
            {t('pptx.description')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" className="mb-6" title={t('common.error')}>
            {error}
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <div className="space-y-6">
                {/* Template Selection - TEMPORARILY HIDDEN (forced blank template only) */}
                {/* <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-sm font-medium text-aws-font-color">
                      {t('pptx.template.label')}
                    </label>
                    <ButtonIcon
                      onClick={() => setShowTemplateUploader(true)}
                      className="h-8 w-8"
                    >
                      <PiPlus />
                    </ButtonIcon>
                  </div>
                  <PptxTemplateSelector
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                    loading={templatesLoading}
                  />
                </div> */}

                {/* Model Selection */}
                <div>
                  <label className="text-aws-font-color mb-3 block text-sm font-medium">
                    AI Model
                  </label>
                  <Select
                    value={selectedModelId}
                    onChange={setSelectedModelId}
                    options={availableModels.map((m) => ({
                      value: m,
                      label: modelDisplayName(m),
                    }))}
                  />
                  <p className="text-aws-font-color-secondary mt-2 text-xs">
                    Select the AI model to generate presentation content
                  </p>
                </div>

                {/* Slide Count */}
                <div>
                  <label className="text-aws-font-color mb-3 block text-sm font-medium">
                    {t('pptx.slideCount.label')}: {slideCount}
                  </label>
                  <Slider
                    value={slideCount}
                    onChange={setSlideCount}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-aws-font-color-secondary mt-1 flex justify-between text-xs">
                    <span>1</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-aws-font-color text-sm font-medium">
                      {t('pptx.options.titleSlide')}
                    </label>
                    <Switch
                      checked={includeTitleSlide}
                      onSwitch={setIncludeTitleSlide}
                      label=""
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-aws-font-color text-sm font-medium">
                      {t('pptx.options.summarySlide')}
                    </label>
                    <Switch
                      checked={includeSummarySlide}
                      onSwitch={setIncludeSummarySlide}
                      label=""
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <div className="space-y-6">
                {/* Instructions Input */}
                <div>
                  <label className="text-aws-font-color mb-3 block text-sm font-medium">
                    {t('pptx.instructions.label')}
                  </label>
                  <Textarea
                    value={instructions}
                    onChange={setInstructions}
                    placeholder={t('pptx.instructions.placeholder')}
                    rows={8}
                    className="w-full"
                  />
                  <p className="text-aws-font-color-secondary mt-2 text-xs">
                    {t('pptx.instructions.help')}
                  </p>
                </div>

                {/* Generation Status */}
                {currentGeneration && (
                  <div className="border-aws-border rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-aws-font-color font-medium">
                          {t('pptx.generation.status')}
                        </h3>
                        <p className="text-aws-font-color-secondary text-sm">
                          {currentGeneration.status === 'generating' &&
                            t('pptx.generation.generating')}
                          {currentGeneration.status === 'completed' &&
                            t('pptx.generation.completed')}
                          {currentGeneration.status === 'failed' &&
                            t('pptx.generation.failed')}
                        </p>
                        {currentGeneration.error_message && (
                          <p className="mt-1 text-sm text-red-600">
                            {currentGeneration.error_message}
                          </p>
                        )}
                      </div>
                      <div>
                        {currentGeneration.status === 'generating' && (
                          <LoadingWave />
                        )}
                        {currentGeneration.status === 'completed' && (
                          <Button onClick={handleDownload}>
                            {t('pptx.download')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGeneratePptx}
                  disabled={isDisabled}
                  loading={isGenerating}
                  className="w-full">
                  {isGenerating ? t('pptx.generating') : t('pptx.generate')}
                </Button>

                {/* Examples */}
                <div className="border-aws-border border-t pt-6">
                  <h3 className="text-aws-font-color mb-3 text-sm font-medium">
                    {t('pptx.examples.title')}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        title: t('pptx.examples.business.title'),
                        content: t('pptx.examples.business.content'),
                      },
                      {
                        title: t('pptx.examples.training.title'),
                        content: t('pptx.examples.training.content'),
                      },
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setInstructions(example.content)}
                        className="border-aws-border hover:border-aws-smile hover:bg-aws-smile/5 rounded-lg border p-3 text-left">
                        <h4 className="text-aws-font-color text-sm font-medium">
                          {example.title}
                        </h4>
                        <p className="text-aws-font-color-secondary mt-1 text-xs">
                          {example.content.slice(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Template Uploader Modal - HIDDEN when template selector is masked */}
        {/* {showTemplateUploader && (
          <PptxTemplateUploader
            onUpload={handleTemplateUpload}
            onClose={() => setShowTemplateUploader(false)}
          />
        )} */}
      </div>
    </div>
  );
};

export default PptxGenerationPage;
