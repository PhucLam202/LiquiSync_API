// File: src/utils/constants/roles.ts
import { Permission, PERMISSION_GROUPS } from './permissions.js';
import { PlanType } from './features.js';

export enum UserRole {
  USER = 'USER',
  PREMIUM_USER = 'PREMIUM_USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface RoleDefinition {
  name: string;
  description: string;
  priority: number;
  permissions: Permission[];
  requiredPlanType: PlanType;
  isSystemRole: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [UserRole.USER]: {
    name: 'User',
    description: 'Standard user with basic access to DeFi data',
    priority: 1,
    permissions: [Permission.READ],
    requiredPlanType: PlanType.FREE,
    isSystemRole: false
  },
  [UserRole.PREMIUM_USER]: {
    name: 'Premium User',
    description: 'Premium user with enhanced access and features',
    priority: 2,
    permissions: [
      Permission.READ,
      Permission.WRITE,
      Permission.CREATE,
      Permission.EXECUTE,
      Permission.MANAGE_API_KEYS,
      Permission.VIEW_USAGE_STATS
    ],
    requiredPlanType: PlanType.STARTER,
    isSystemRole: false
  },
  [UserRole.ADMIN]: {
    name: 'Admin',
    description: 'Administrator with user management capabilities',
    priority: 3,
    permissions: [
      ...PERMISSION_GROUPS.DATA_ACCESS,
      ...PERMISSION_GROUPS.ANALYTICS,
      ...PERMISSION_GROUPS.API_MANAGEMENT,
      ...PERMISSION_GROUPS.USER_MANAGEMENT,
      Permission.SYSTEM_MONITOR
    ],
    requiredPlanType: PlanType.ENTERPRISE,
    isSystemRole: true
  },
  [UserRole.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Super administrator with full system access',
    priority: 4,
    permissions: PERMISSION_GROUPS.ALL_PERMISSIONS,
    requiredPlanType: PlanType.ENTERPRISE,
    isSystemRole: true
  }
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY = {
  [UserRole.USER]: 0,
  [UserRole.PREMIUM_USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3
} as const;

// Helper functions
export class RoleService {
  static getRoleByName(roleName: string): RoleDefinition | undefined {
    return ROLE_DEFINITIONS[roleName as UserRole];
  }

  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    return roleDefinition?.permissions.includes(permission) || false;
  }

  static canAccessPlan(userRole: UserRole, planType: PlanType): boolean {
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    if (!roleDefinition) return false;

    const planHierarchy = {
      [PlanType.FREE]: 0,
      [PlanType.STARTER]: 1,
      [PlanType.PROFESSIONAL]: 2,
      [PlanType.ENTERPRISE]: 3
    };

    return planHierarchy[planType] >= planHierarchy[roleDefinition.requiredPlanType];
  }

  static isHigherRole(role1: UserRole, role2: UserRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
  }

  static getAllPermissions(userRole: UserRole): Permission[] {
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    return roleDefinition?.permissions || [];
  }
}

// Default role assignments for new users
export const DEFAULT_ROLES = {
  NEW_USER: UserRole.USER,
  ENTERPRISE_USER: UserRole.PREMIUM_USER
} as const;