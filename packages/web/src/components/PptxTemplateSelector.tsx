import React from 'react';
import { useTranslation } from 'react-i18next';
import { PiPresentation, PiGlobe, PiUser } from 'react-icons/pi';
import LoadingWave from './LoadingWave';
import { PptxTemplate } from '../@types/pptx';

interface PptxTemplateSelectorProps {
  templates: PptxTemplate[];
  selectedTemplate: PptxTemplate | null;
  onSelectTemplate: (template: PptxTemplate | null) => void;
  loading?: boolean;
}

const PptxTemplateSelector: React.FC<PptxTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingWave />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Blank Template Option */}
      <div
        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
          selectedTemplate === null
            ? 'border-aws-smile bg-aws-smile/10'
            : 'border-aws-border hover:border-aws-smile/50'
        }`}
        onClick={() => onSelectTemplate(null)}>
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
            <PiPresentation className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-aws-font-color text-sm font-medium">
              {t('pptx.template.blank')}
            </h3>
            <p className="text-aws-font-color-secondary text-xs">
              {t('pptx.template.blankDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Available Templates */}
      {templates.length === 0 ? (
        <div className="border-aws-border rounded-lg border border-dashed p-6 text-center">
          <PiPresentation className="text-aws-font-color-secondary mx-auto mb-2 h-8 w-8" />
          <p className="text-aws-font-color-secondary text-sm">
            {t('pptx.template.noTemplates')}
          </p>
        </div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {templates.map((template) => (
            <div
              key={template.template_id}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                selectedTemplate?.template_id === template.template_id
                  ? 'border-aws-smile bg-aws-smile/10'
                  : 'border-aws-border hover:border-aws-smile/50'
              }`}
              onClick={() => onSelectTemplate(template)}>
              <div className="flex items-start space-x-3">
                <div className="bg-aws-smile/10 flex h-10 w-10 items-center justify-center rounded-md">
                  <PiPresentation className="text-aws-smile h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-aws-font-color truncate text-sm font-medium">
                      {template.template_name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {template.is_public ? (
                        <PiGlobe
                          className="h-3 w-3 text-green-600"
                          title={t('pptx.template.public')}
                        />
                      ) : (
                        <PiUser
                          className="h-3 w-3 text-blue-600"
                          title={t('pptx.template.private')}
                        />
                      )}
                    </div>
                  </div>
                  {template.template_description && (
                    <p className="text-aws-font-color-secondary mt-1 line-clamp-2 text-xs">
                      {template.template_description}
                    </p>
                  )}
                  {template.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-aws-smile/10 text-aws-smile inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-aws-font-color-secondary text-xs">
                          {t('pptx.template.moreTags', {
                            count: template.tags.length - 3,
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PptxTemplateSelector;
