import React, { useState } from 'react';
import { FaSearch, FaHistory, FaFlask, FaBrain, FaLightbulb } from 'react-icons/fa';
import { IoMdDocument } from 'react-icons/io';
import { AiOutlineExperiment } from 'react-icons/ai';
import { ImLab } from 'react-icons/im';
import { MdScience, MdOutlineEngineering, MdCompare } from 'react-icons/md';

import { MaterialSearchInput } from '../../components/materials/MaterialSearchInput';
import { MaterialPropertyCard } from '../../components/materials/MaterialPropertyCard';
import { MaterialStructureViewer } from '../../components/materials/MaterialStructureViewer';
import { MaterialFormula } from '../../components/materials/MaterialFormula';
import { ChatList } from '../../components/ChatList';
import { Tabs } from '../../components/Tabs';
import { InputChatContent } from '../../components/InputChatContent';
import { Card } from '../../components/Card';
import { ChatMessage } from '../../components/ChatMessage';
import { RowItem } from '../../components/RowItem';
import { ButtonCopy } from '../../components/ButtonCopy';
import { Markdown } from '../../components/Markdown';

export const MaterialAIPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: string;
      content: string;
      timestamp: Date;
      isLoading?: boolean;
      id: string;
    }>
  >([]);
  const [materialData, setMaterialData] = useState<{
    name: string;
    formula: string;
    properties: {
      density: string;
      bandgap: string;
      temperature: string;
      conductivity: string;
    };
    structure: string;
    applications: string[];
    description: string;
  } | null>(null);
  
  // モック検索処理
  const handleSearch = (query: string) => {
    setIsLoading(true);
    setSearchQuery(query);
    
    // データ取得をシミュレート
    setTimeout(() => {
      if (query.toLowerCase().includes('tio2') || query.toLowerCase().includes('酸化チタン')) {
        setMaterialData({
          name: '二酸化チタン',
          formula: 'TiO2',
          properties: {
            density: '4.23',
            bandgap: '3.2',
            temperature: '1843',
            conductivity: '0.1',
          },
          structure: 'XYZ構造データ（実際には原子座標データ）',
          applications: ['光触媒', '色素増感太陽電池', '紫外線吸収剤'],
          description: '二酸化チタン（TiO2）は、優れた光触媒特性と化学的安定性を持つ無機化合物です。主にルチル、アナターゼ、ブルッカイトの3つの結晶構造が存在し、光触媒として太陽電池や環境浄化に広く利用されています。'
        });
      } else if (query.toLowerCase().includes('perovskite') || query.toLowerCase().includes('ペロブスカイト')) {
        setMaterialData({
          name: 'ペロブスカイト',
          formula: 'CH3NH3PbI3',
          properties: {
            density: '4.16',
            bandgap: '1.55',
            temperature: '330',
            conductivity: '10-4',
          },
          structure: 'XYZ構造データ（実際には原子座標データ）',
          applications: ['太陽電池', 'LEDデバイス', '光検出器'],
          description: 'ペロブスカイト（CH3NH3PbI3）は高効率な太陽電池材料として注目されている有機-無機ハイブリッド化合物です。優れた光吸収特性と長い電子-正孔拡散長を持ち、次世代太陽電池の有力候補とされています。'
        });
      } else {
        setMaterialData(null);
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleChatSubmit = (message: string) => {
    const userMsg = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      id: `user-${Date.now()}`
    };
    
    const assistantMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      id: `assistant-${Date.now()}`
    };
    
    setChatMessages([...chatMessages, userMsg, assistantMsg]);
    
    // AI応答をシミュレート
    setTimeout(() => {
      setChatMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (updated[lastIndex] && updated[lastIndex].role === 'assistant') {
          if (message.toLowerCase().includes('バンドギャップ')) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: 'バンドギャップとは、物質の価電子帯と伝導帯のエネルギー差を指します。半導体の光学・電気的特性を決定する重要なパラメータです。\n\n二酸化チタン(TiO2)の場合、アナターゼ相では約3.2 eV、ルチル相では約3.0 eVのバンドギャップを持っています。このため、二酸化チタンは紫外光を吸収することができ、光触媒として機能します。\n\nバンドギャップの大きさにより次のような分類ができます：\n- 0 eV: 金属（例：金、銀、銅）\n- 0.1-3 eV: 半導体（例：シリコン、ゲルマニウム）\n- 3 eV以上: 絶縁体（例：ダイヤモンド）',
              isLoading: false
            };
          } else if (message.toLowerCase().includes('ペロブスカイト') || message.toLowerCase().includes('太陽電池')) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: 'ペロブスカイト太陽電池は、ペロブスカイト構造を持つ材料を光吸収層として利用する新しいタイプの太陽電池です。一般的に有機-無機ハイブリッドペロブスカイト（CH3NH3PbI3など）が使用されます。\n\n**主な特徴:**\n- 高い光吸収係数\n- 長い電子と正孔の拡散長\n- 溶液プロセスによる低コスト製造\n- 現在、研究室レベルで25%を超える変換効率を達成\n\n**課題:**\n- 水分や熱に対する安定性の問題\n- 鉛の毒性\n- スケールアップの難しさ\n\nこれらの課題を解決するため、A-サイト、B-サイト、X-サイトの各イオンを置換する研究が活発に行われています。例えば、Cs+やFA+によるMA+の置換、Sn2+によるPb2+の部分置換などが検討されています。',
              isLoading: false
            };
          } else {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: `ご質問ありがとうございます。「${message}」について、材料科学の観点から考えると、材料の特性と応用に関して重要なポイントがいくつかあります。\n\nまず、材料設計では原子・分子レベルの構造が物性を決定することが基本です。例えば、結晶構造、欠陥、界面などが電気的・機械的・光学的特性に大きな影響を与えます。\n\n新材料開発では計算科学とAIの活用が加速しており、実験だけでなく理論的予測が重要になっています。特に第一原理計算や機械学習による物性予測が注目されています。\n\nさらに詳しい情報が必要でしたら、具体的にお知らせください。材料の特定の側面や応用分野について詳細に説明いたします。`,
              isLoading: false
            };
          }
        }
        
        return updated;
      });
    }, 2000);
  };

  const tabOptions = [
    { id: 'properties', label: '物性', icon: <FaFlask /> },
    { id: 'structure', label: '構造', icon: <MdScience /> },
    { id: 'applications', label: '応用', icon: <MdOutlineEngineering /> },
    { id: 'similar', label: '類似材料', icon: <MdCompare /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">材料AI アシスタント</h1>
        <p className="text-gray-600">
          材料の特性、構造、応用に関する質問に回答します
        </p>
      </div>

      <div className="mb-8">
        <MaterialSearchInput 
          onSearch={handleSearch} 
          isLoading={isLoading} 
          placeholder="材料名、化学式、特性などを検索（例: TiO2, ペロブスカイト）" 
        />
      </div>

      {!searchQuery && !materialData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-blue-100 p-3">
                <FaBrain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium">材料特性予測</h3>
              <p className="text-gray-600">
                組成から物理的・化学的特性を予測します
              </p>
            </div>
          </Card>
          <Card>
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <AiOutlineExperiment className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium">実験設計支援</h3>
              <p className="text-gray-600">
                AI支援による実験条件の最適化と提案
              </p>
            </div>
          </Card>
          <Card>
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-purple-100 p-3">
                <ImLab className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium">論文解析</h3>
              <p className="text-gray-600">
                研究文献からの新しい知見の抽出と要約
              </p>
            </div>
          </Card>
          <Card>
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-yellow-100 p-3">
                <FaLightbulb className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium">材料設計提案</h3>
              <p className="text-gray-600">
                特定の用途に適した新材料の提案
              </p>
            </div>
          </Card>
          <Card>
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <IoMdDocument className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium">論文執筆支援</h3>
              <p className="text-gray-600">
                研究成果の論文化と図表作成の支援
              </p>
            </div>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 rounded-xl bg-white p-4 shadow-md">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <div>材料データを検索中...</div>
          </div>
        </div>
      )}

      {materialData && !isLoading && (
        <div className="space-y-8">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{materialData.name}</h2>
                <div className="mt-1">
                  <MaterialFormula formula={materialData.formula} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ButtonCopy text={materialData.name} />
              </div>
            </div>
            <div className="mt-4">
              <Markdown content={materialData.description} />
            </div>
          </div>

          <div>
            <Tabs 
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="mt-4 rounded-lg bg-white p-6 shadow-md">
              {activeTab === 'properties' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <MaterialPropertyCard 
                    title="密度"
                    property="density"
                    value={materialData.properties.density}
                    unit="g/cm³"
                    description="材料の単位体積あたりの質量"
                  />
                  <MaterialPropertyCard 
                    title="バンドギャップ"
                    property="bandgap"
                    value={materialData.properties.bandgap}
                    unit="eV"
                    description="価電子帯と伝導帯のエネルギー差"
                  />
                  <MaterialPropertyCard 
                    title="融点"
                    property="temperature"
                    value={materialData.properties.temperature}
                    unit="K"
                    description="固相から液相に変化する温度"
                  />
                  <MaterialPropertyCard 
                    title="電気伝導度"
                    property="conductivity"
                    value={materialData.properties.conductivity}
                    unit="S/cm"
                    description="電気を伝導する能力の指標"
                  />
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <MaterialStructureViewer molData={materialData.structure} height="400px" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800">結晶構造情報</h3>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <RowItem label="空間群">P42/mnm (ルチル)</RowItem>
                      <RowItem label="格子定数">a = 4.594 Å, c = 2.959 Å</RowItem>
                      <RowItem label="単位胞体積">62.43 Å³</RowItem>
                      <RowItem label="配位数">Ti: 6, O: 3</RowItem>
                      <RowItem label="原子位置">
                        Ti: (0, 0, 0), O: (0.305, 0.305, 0)
                      </RowItem>
                    </div>
                    <button className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                      構造データをダウンロード
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'applications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">主な応用分野</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {materialData.applications.map((app, index) => (
                      <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <h4 className="mb-2 font-medium text-gray-800">{app}</h4>
                        <p className="text-sm text-gray-600">
                          {app === '光触媒' && 'UV光照射下での酸化還元反応を触媒し、有機汚染物質の分解や抗菌作用に利用されます。'}
                          {app === '色素増感太陽電池' && '広い光吸収領域を持つ色素と組み合わせて、太陽光から電気エネルギーへの変換に使用されます。'}
                          {app === '紫外線吸収剤' && '紫外線を効果的に吸収し、化粧品や日焼け止めに配合されています。'}
                          {app === '太陽電池' && 'バンドギャップ特性を活かした高効率な太陽電池材料として使用されます。'}
                          {app === 'LEDデバイス' && '発光特性を活用した発光ダイオードデバイスに応用されています。'}
                          {app === '光検出器' && '光に対する高い応答性を活かした光センサーとして使用されます。'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-8 text-lg font-medium text-gray-800">最近の研究動向</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <Markdown content="
* ドーピングによる光吸収領域の可視光への拡張
* ナノ構造化による表面積の増大と反応効率の向上
* ヘテロ接合形成による電荷分離効率の改善
* 環境負荷の少ない合成プロセスの開発
                    " />
                  </div>
                </div>
              )}

              {activeTab === 'similar' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">類似材料</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium">酸化亜鉛 (ZnO)</h4>
                        <MaterialFormula formula="ZnO" />
                      </div>
                      <p className="mb-2 text-sm text-gray-600">類似度: 87%</p>
                      <p className="text-sm text-gray-600">
                        ウルツ鉱型結晶構造を持つ半導体材料。バンドギャップは約3.37 eVで、光触媒や紫外線遮蔽剤として利用。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium">酸化スズ</h4>
                        <MaterialFormula formula="SnO2" />
                      </div>
                      <p className="mb-2 text-sm text-gray-600">類似度: 79%</p>
                      <p className="text-sm text-gray-600">
                        ルチル型結晶構造を持つ透明な半導体。広いバンドギャップ(約3.6 eV)を持ち、ガスセンサーや透明電極に使用。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium">酸化セリウム</h4>
                        <MaterialFormula formula="CeO2" />
                      </div>
                      <p className="mb-2 text-sm text-gray-600">類似度: 71%</p>
                      <p className="text-sm text-gray-600">
                        蛍石型結晶構造を持つ酸化物。優れた酸素貯蔵能力と酸化還元特性を持ち、触媒やポリッシング材として利用。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800">材料に関する質問</h3>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 max-h-96 overflow-y-auto">
                {chatMessages.length > 0 ? (
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        content={msg.content}
                        role={msg.role}
                        isStreaming={msg.isLoading}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                    <FaSearch className="mb-2 h-8 w-8" />
                    <p className="mb-1">
                      材料についての質問をしてみましょう
                    </p>
                    <p className="text-sm">
                      例: "バンドギャップとは何ですか？", "ペロブスカイト太陽電池の効率向上の研究動向を教えて"
                    </p>
                  </div>
                )}
              </div>
              <InputChatContent
                onSendMessage={handleChatSubmit}
                placeholder="材料や物性に関する質問を入力..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};