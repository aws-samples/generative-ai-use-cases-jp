import React from 'react';
import useRoleMonitor from '../hooks/useRoleMonitor';

interface RoleMonitorProviderProps {
  children: React.ReactNode;
}

export const RoleMonitorProvider: React.FC<RoleMonitorProviderProps> = ({
  children,
}) => {
  // Initialize role monitoring with default settings
  useRoleMonitor({
    pollingInterval: 30000, // Check every 30 seconds
    checkOnFocus: true, // Check when window gains focus
    enabled: true, // Always enabled
  });

  return <>{children}</>;
};
