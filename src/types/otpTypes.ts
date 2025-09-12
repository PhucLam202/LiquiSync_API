// File: src/services/otp/otpTypes.ts
export enum OTPType {
  VERIFY_EMAIL_REGISTER = 'VERIFY_EMAIL_REGISTER',
  SIGNUP_VERIFICATION = 'SIGNUP_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN_2FA = 'LOGIN_2FA'
}

// For backwards compatibility with string literals
export type OTPTypeString = 'VERIFY_EMAIL_REGISTER' | 'SIGNUP_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_2FA';

export interface OTPRecord {
  id: string;
  userId: string;
  code: string;
  type: OTPType;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

export interface GenerateOtpResult {
  success: boolean;
  message: string;
  expiresAt: Date;
  // otpTokenId?: string; // COMMENTED OUT: Not used in simplified flow
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
}