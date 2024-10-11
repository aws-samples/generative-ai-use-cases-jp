import React from 'react';
import Card from '../../components/Card';
import AppBuilderView from '../../components/useCaseBuilder/UseCaseBuilderView';

const UseCaseBuilderExecutePage: React.FC = () => {
  const title = '英語翻訳';
  const promptTemplate = `英語翻訳してください。
<本文>
{{text:本文}}
</本文>
<翻訳条件>
{{text:翻訳条件}}
</翻訳条件>`;

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <div className="col-span-12">
        <Card>
          <AppBuilderView title={title} promptTemplate={promptTemplate} />
        </Card>
      </div>
    </div>
  );
};

export default UseCaseBuilderExecutePage;
