// File: src/utils/constants/permissions.ts
export enum Permission {
  // Data Access Permissions
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  
  // Administrative Permissions
  ADMIN = 'ADMIN',
  
  // Feature-specific Permissions
  EXECUTE = 'EXECUTE',
  
  // API Management Permissions
  MANAGE_API_KEYS = 'MANAGE_API_KEYS',
  VIEW_USAGE_STATS = 'VIEW_USAGE_STATS',
  
  // User Management Permissions
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  
  // System Permissions
  SYSTEM_MONITOR = 'SYSTEM_MONITOR',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG'
}

export interface PermissionDefinition {
  name: string;
  description: string;
  category: PermissionCategory;
  isSystemLevel: boolean;
}

export enum PermissionCategory {
  DATA = 'data',
  ADMIN = 'admin',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  API_MANAGEMENT = 'api_management'
}

export const PERMISSION_DEFINITIONS: Record<Permission, PermissionDefinition> = {
  [Permission.READ]: {
    name: 'Read',
    description: 'Read access to data endpoints',
    category: PermissionCategory.DATA,
    isSystemLevel: false
  },
  [Permission.WRITE]: {
    name: 'Write',
    description: 'Write access to modify data',
    category: PermissionCategory.DATA,
    isSystemLevel: false
  },
  [Permission.DELETE]: {
    name: 'Delete',
    description: 'Delete access to remove data',
    category: PermissionCategory.DATA,
    isSystemLevel: false
  },
  [Permission.CREATE]: {
    name: 'Create',
    description: 'Create new resources',
    category: PermissionCategory.DATA,
    isSystemLevel: false
  },
  [Permission.ADMIN]: {
    name: 'Admin',
    description: 'Administrative access to all features',
    category: PermissionCategory.ADMIN,
    isSystemLevel: true
  },
  [Permission.EXECUTE]: {
    name: 'Execute',
    description: 'Execute advanced operations and analytics',
    category: PermissionCategory.ANALYTICS,
    isSystemLevel: false
  },
  [Permission.MANAGE_API_KEYS]: {
    name: 'Manage API Keys',
    description: 'Create, view, and revoke API keys',
    category: PermissionCategory.API_MANAGEMENT,
    isSystemLevel: false
  },
  [Permission.VIEW_USAGE_STATS]: {
    name: 'View Usage Stats',
    description: 'View usage statistics and analytics',
    category: PermissionCategory.API_MANAGEMENT,
    isSystemLevel: false
  },
  [Permission.MANAGE_USERS]: {
    name: 'Manage Users',
    description: 'Manage user accounts and permissions',
    category: PermissionCategory.ADMIN,
    isSystemLevel: true
  },
  [Permission.VIEW_AUDIT_LOGS]: {
    name: 'View Audit Logs',
    description: 'Access to security and audit logs',
    category: PermissionCategory.ADMIN,
    isSystemLevel: true
  },
  [Permission.SYSTEM_MONITOR]: {
    name: 'System Monitor',
    description: 'Monitor system health and performance',
    category: PermissionCategory.SYSTEM,
    isSystemLevel: true
  },
  [Permission.SYSTEM_CONFIG]: {
    name: 'System Config',
    description: 'Configure system settings',
    category: PermissionCategory.SYSTEM,
    isSystemLevel: true
  }
};

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  DATA_ACCESS: [Permission.READ, Permission.WRITE, Permission.CREATE, Permission.DELETE],
  ANALYTICS: [Permission.READ, Permission.EXECUTE],
  API_MANAGEMENT: [Permission.MANAGE_API_KEYS, Permission.VIEW_USAGE_STATS],
  USER_MANAGEMENT: [Permission.MANAGE_USERS, Permission.VIEW_AUDIT_LOGS],
  SYSTEM_ADMIN: [Permission.ADMIN, Permission.SYSTEM_MONITOR, Permission.SYSTEM_CONFIG],
  ALL_PERMISSIONS: Object.values(Permission)
} as const;