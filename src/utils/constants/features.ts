// File: src/utils/constants/features.ts
export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE'
}

export enum FeatureCode {
  DEFI_DATA = 'DEFI_DATA',
  ANALYTICS = 'ANALYTICS', 
  API_MANAGEMENT = 'API_MANAGEMENT',
  EXPORT = 'EXPORT',
  MONITORING = 'MONITORING',
  ADMIN = 'ADMIN'
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE', 
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE'
}

export interface FeatureConfig {
  code: FeatureCode;
  name: string;
  description: string;
  requiredPlanType: PlanType;
  requiredPermissions: string[];
  isActive: boolean;
}

export const FEATURE_CONFIGS: Record<FeatureCode, FeatureConfig> = {
  [FeatureCode.DEFI_DATA]: {
    code: FeatureCode.DEFI_DATA,
    name: 'DeFi Data Access',
    description: 'Access to DeFi protocol data',
    requiredPlanType: PlanType.FREE,
    requiredPermissions: ['READ'],
    isActive: true
  },
  [FeatureCode.ANALYTICS]: {
    code: FeatureCode.ANALYTICS,
    name: 'Advanced Analytics',
    description: 'Access to analytics and insights',
    requiredPlanType: PlanType.PROFESSIONAL,
    requiredPermissions: ['READ', 'EXECUTE'],
    isActive: true
  },
  [FeatureCode.API_MANAGEMENT]: {
    code: FeatureCode.API_MANAGEMENT,
    name: 'API Management',
    description: 'API key and usage management',
    requiredPlanType: PlanType.STARTER,
    requiredPermissions: ['READ', 'WRITE'],
    isActive: true
  },
  [FeatureCode.EXPORT]: {
    code: FeatureCode.EXPORT,
    name: 'Data Export',
    description: 'Export data to CSV/Excel',
    requiredPlanType: PlanType.STARTER,
    requiredPermissions: ['READ', 'EXECUTE'],
    isActive: true
  },
  [FeatureCode.MONITORING]: {
    code: FeatureCode.MONITORING,
    name: 'System Monitoring',
    description: 'System health and performance monitoring',
    requiredPlanType: PlanType.PROFESSIONAL,
    requiredPermissions: ['READ'],
    isActive: true
  },
  [FeatureCode.ADMIN]: {
    code: FeatureCode.ADMIN,
    name: 'Administration',
    description: 'System administration features',
    requiredPlanType: PlanType.ENTERPRISE,
    requiredPermissions: ['ADMIN'],
    isActive: true
  }
};