import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This page redirects to RagChatBotEditPage for creation
const AssistantCreatePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/rag-chat-bot/create');
  }, [navigate]);

  return null;
};

export default AssistantCreatePage;
