import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import { PiRobot as RobotIcon } from 'react-icons/pi';
import { useAgentCore } from '../hooks/useAgentCore';

const AgentCoreListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { getAllAvailableRuntimes, getGenericRuntime, getExternalRuntimes } =
    useAgentCore('/agent-core-list');

  const allRuntimes = getAllAvailableRuntimes();
  const genericRuntime = getGenericRuntime();
  const externalRuntimes = getExternalRuntimes();

  const handleSelect = (name: string) => {
    navigate(`/agent-core/${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-row items-center justify-center">
        <div className="text-xl font-semibold">{t('agent_core.title')}</div>
      </div>

      {allRuntimes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <RobotIcon className="mb-4 h-12 w-12" />
          <p className="text-sm font-bold">
            {t('agent_core.no_runtimes_available')}
          </p>
        </div>
      ) : (
        <Card>
          {allRuntimes.map((runtime, idx) => {
            const isGeneric =
              genericRuntime && runtime.arn === genericRuntime.arn;
            const isExternal = externalRuntimes.some(
              (r) => r.arn === runtime.arn
            );
            const tag = isGeneric
              ? 'Generic'
              : isExternal
                ? 'External'
                : undefined;

            return (
              <div
                key={runtime.arn}
                className={`flex cursor-pointer flex-row items-center gap-3 p-3 hover:bg-gray-100 ${idx > 0 ? 'border-t' : ''}`}
                onClick={() => handleSelect(runtime.name)}>
                <RobotIcon className="h-8 w-8 shrink-0 text-gray-400" />
                <div className="flex flex-1 flex-col">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-bold">{runtime.name}</span>
                    {tag && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {tag}
                      </span>
                    )}
                  </div>
                  {runtime.description && (
                    <span className="line-clamp-2 text-xs font-light text-gray-600">
                      {runtime.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default AgentCoreListPage;
