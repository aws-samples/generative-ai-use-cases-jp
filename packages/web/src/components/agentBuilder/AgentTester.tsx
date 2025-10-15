import React, { useState } from 'react';
import AgentChatUnified from './AgentChatUnified';
import { AgentConfiguration } from 'generative-ai-use-cases';
import { v4 as uuidv4 } from 'uuid';

interface AgentTesterProps {
  agent: AgentConfiguration;
}

const AgentTester: React.FC<AgentTesterProps> = ({ agent }) => {
  const [sessionId] = useState(() => uuidv4());

  return (
    <AgentChatUnified
      agent={agent}
      sessionId={sessionId}
      showHeader={true}
      layout="card"
      hideScrollButtons={true}
    />
  );
};

export default AgentTester;
