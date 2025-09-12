// File: src/types/linkingTypes.ts
// Type definitions for account linking functionality

export enum LinkingType {
  EMAIL_TO_WEB3 = 'EMAIL_TO_WEB3',        // Added wallet to existing email account
  WEB3_TO_EMAIL = 'WEB3_TO_EMAIL',        // Added email to existing wallet account  
  ALREADY_LINKED = 'ALREADY_LINKED',      // Accounts are already connected
  LINK_CONFLICT = 'LINK_CONFLICT'         // Both accounts exist but different users
}

export interface LinkAccountRequest {
  email: string;
  walletAddress: string;
}

export interface LinkAccountResponse {
  success: true;
  type: LinkingType;
  message: string;
  data: {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      walletAddress: string | null;
      fullName: string | null;
      authType: 'EMAIL' | 'WEB3' | 'HYBRID';
      isEmailVerified: boolean;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    };
    linkedAt: string;
  };
}

export interface LinkingStatusResponse {
  success: true;
  data: {
    canLink: boolean;
    linkingType: LinkingType | null;
    reason: string;
    existingAccounts: {
      email: boolean;
      wallet: boolean;
    };
  };
}