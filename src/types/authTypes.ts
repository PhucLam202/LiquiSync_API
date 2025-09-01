// File: src/types/authTypes.ts
import { UserStatus } from '@prisma/client';

/**
 * User Status Constants - Easier to use and manage
 */
export const USER_STATUS_CONSTANTS = {
  PENDING_VERIFICATION: UserStatus.PENDING_VERIFICATION,
  EMAIL_VERIFIED: UserStatus.EMAIL_VERIFIED,
  ACTIVE: UserStatus.ACTIVE,
  INACTIVE: UserStatus.INACTIVE,
  BLOCKED: UserStatus.BLOCKED,
  DELETED: UserStatus.DELETED,
} as const;

/**
 * User Status Type for better type safety
 */
export type UserStatusType = typeof UserStatus[keyof typeof UserStatus];

/**
 * User Status Messages for consistent error handling
 */
export const USER_STATUS_MESSAGES = {
  [UserStatus.PENDING_VERIFICATION]: 'Please verify your email to activate your account',
  [UserStatus.EMAIL_VERIFIED]: 'Email verified successfully. Please complete your profile',
  [UserStatus.ACTIVE]: 'Account is active',
  [UserStatus.INACTIVE]: 'Account is temporarily inactive',
  [UserStatus.BLOCKED]: 'Account has been blocked. Contact support',
  [UserStatus.DELETED]: 'Account has been deleted',
} as const;

/**
 * User Status Validation Map
 */
export const USER_STATUS_VALIDATION = {
  [UserStatus.PENDING_VERIFICATION]: false,
  [UserStatus.EMAIL_VERIFIED]: false,
  [UserStatus.ACTIVE]: true,
  [UserStatus.INACTIVE]: false,
  [UserStatus.BLOCKED]: false,
  [UserStatus.DELETED]: false,
} as const;

/**
 * Helper function to check if user status is valid for login
 */
export const isValidStatusForLogin = (status: UserStatus): boolean => {
  return USER_STATUS_VALIDATION[status];
};

/**
 * Helper function to get user status message
 */
export const getUserStatusMessage = (status: UserStatus): string => {
  return USER_STATUS_MESSAGES[status];
};

/**
 * Helper function to check if user can perform actions
 */
export const canUserPerformActions = (status: UserStatus): boolean => {
  return status === UserStatus.ACTIVE;
};

/**
 * Helper function to check if user needs verification
 */
export const needsVerification = (status: UserStatus): boolean => {
  return status === UserStatus.PENDING_VERIFICATION;
};

/**
 * Helper function to check if user is email verified
 */
export const isEmailVerified = (status: UserStatus): boolean => {
  return status === UserStatus.EMAIL_VERIFIED || status === UserStatus.ACTIVE;
};

/**
 * Auth-related interfaces
 */
export interface RegisterDto {
  email: string;    
  password: string;
  fullName: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    walletAddress?: string | null;
    authType?: string;
  };
}

export interface VerificationResult {
  success: boolean;
  message: string;
}

/**
 * User Status Flow Constants
 */
export const USER_STATUS_FLOW = {
  // Registration flow: PENDING -> EMAIL_VERIFIED -> ACTIVE
  REGISTRATION: [
    UserStatus.PENDING_VERIFICATION,
    UserStatus.EMAIL_VERIFIED,
    UserStatus.ACTIVE
  ],
  
  // Admin actions
  ADMIN_ACTIONS: [
    UserStatus.INACTIVE,
    UserStatus.BLOCKED,
    UserStatus.DELETED
  ],
  
  // Active states that allow login
  ACTIVE_STATES: [UserStatus.ACTIVE],
  
  // States that prevent login
  BLOCKED_STATES: [
    UserStatus.PENDING_VERIFICATION,
    UserStatus.INACTIVE,
    UserStatus.BLOCKED,
    UserStatus.DELETED
  ]
} as const; 