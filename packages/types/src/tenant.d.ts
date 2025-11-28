import { HiddenUseCases } from './useCases';

export type SelfSignUpTenantMapEntry = {
  tenantId: string;
  domains?: string[];
  emails?: string[];
};

export type TenantUseCaseConfiguration = {
  tenantId: string;
  hiddenUseCases: HiddenUseCases;
  updatedAt: string;
  updatedBy: string; // User ID who made the change
};

export type TenantUseCaseToggleRequest = {
  tenantId: string;
  hiddenUseCases: HiddenUseCases;
};

export interface TenantUseCaseConfigResponse {
  tenantId: string | null;
  hiddenUseCases: HiddenUseCases;
  source: 'tenant' | 'global' | 'global_fallback';
  globalHiddenUseCases?: HiddenUseCases;
  // Global configuration from deployment settings
  assistantCreationRequiresAdmin?: boolean;
  error?: string;
}

export interface IpAccessControl {
  enabled: boolean;
  allowedIpV4AddressRanges: string[];
  allowedIpV6AddressRanges: string[];
  updatedAt: string;
  updatedBy: string;
}
