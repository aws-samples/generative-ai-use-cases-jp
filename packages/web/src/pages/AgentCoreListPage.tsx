import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import InputText from '../components/InputText';
import { useAgentCore } from '../hooks/useAgentCore';
import { AgentCoreConfiguration } from 'generative-ai-use-cases';

const AgentCoreListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { getAllAvailableRuntimes } = useAgentCore('agent-core-list');

  const filteredRuntimes = useMemo(() => {
    const allRuntimes = getAllAvailableRuntimes();
    if (!searchTerm) return allRuntimes;
    const term = searchTerm.toLowerCase();
    return allRuntimes.filter((runtime) => {
      const displayName = runtime.display_name || runtime.name;
      return (
        displayName.toLowerCase().includes(term) ||
        runtime.name.toLowerCase().includes(term) ||
        runtime.description.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, getAllAvailableRuntimes]);

  const handleClick = (runtime: AgentCoreConfiguration) => {
    navigate(`/agent-core/${encodeURIComponent(runtime.arn)}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="hidden items-center justify-center text-xl font-semibold lg:flex print:flex">
        {t('agent_core.agent_list')}
      </div>

      <Card>
        <div className="mb-4">
          <InputText
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('agent_core.search_agents')}
          />
        </div>

        {filteredRuntimes.length === 0 && (
          <div className="flex w-full items-center justify-center py-16 text-sm font-bold text-gray-400">
            {t('agent_core.no_agents')}
          </div>
        )}

        {filteredRuntimes.map((runtime, idx) => {
          const displayName = runtime.display_name || runtime.name;

          return (
            <div
              key={idx}
              className={`flex cursor-pointer flex-row items-center gap-x-2 p-3 hover:bg-gray-100 ${idx > 0 ? 'border-t' : ''}`}
              onClick={() => handleClick(runtime)}>
              <div className="flex flex-1 flex-col justify-start">
                <div className="mb-1 line-clamp-1 text-sm font-bold">
                  {displayName}
                </div>
                <div className="line-clamp-2 text-xs font-light text-gray-600">
                  {runtime.description}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default AgentCoreListPage;
