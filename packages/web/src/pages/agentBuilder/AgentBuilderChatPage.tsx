import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../../components/Button';
import AgentChatUnified from '../../components/agentBuilder/AgentChatUnified';
import { useAgentBuilder } from '../../hooks/agentBuilder/useAgentBuilder';
import { PiRobot as RobotIcon } from 'react-icons/pi';

const AgentBuilderChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const { agent, loading, error } = useAgentBuilder(agentId);

  const handleBack = () => {
    navigate('/agent-builder');
  };

  const handleEdit = () => {
    navigate(`/agent-builder/${agentId}/edit`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-aws-sky h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-600">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <RobotIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mb-4 text-xl font-semibold text-gray-900">{error}</h1>
          <Button onClick={handleBack} outlined>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  // Agent not found
  if (!agent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <RobotIcon className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="mb-4 text-xl font-semibold text-gray-900">
            {t('agent_builder.agent_not_found')}
          </h1>
          <Button onClick={handleBack} outlined>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <AgentChatUnified
      agent={agent}
      layout="fullscreen"
      showHeader={true}
      showAgentInfo={true}
      showEditButton={agent.isMyAgent} // Only show edit button if user owns the agent
      onEdit={handleEdit}
      onBack={handleBack}
    />
  );
};

export default AgentBuilderChatPage;
