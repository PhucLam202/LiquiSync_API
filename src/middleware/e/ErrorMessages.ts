import { ErrorCode } from './ErrorCode.js';

export const ErrorMessages: { [key in ErrorCode]: string } = {
  // General Errors
  [ErrorCode.UNKNOWN_ERROR]: "Unknown error occurred",
  [ErrorCode.NOT_FOUND]: "Resource not found",
  [ErrorCode.BAD_REQUEST]: "Bad request",
  [ErrorCode.VALIDATION_ERROR]: "Validation error",
  
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: "Unauthorized access",
  [ErrorCode.FORBIDDEN]: "Access forbidden",
  [ErrorCode.INVALID_CREDENTIALS]: "Invalid credentials provided",
  [ErrorCode.TOKEN_EXPIRED]: "Authentication token has expired",
  [ErrorCode.TOKEN_INVALID]: "Invalid authentication token",
  [ErrorCode.TOKEN_MISSING]: "Authentication token is missing",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: "Insufficient permissions to access this resource",
  [ErrorCode.ACCOUNT_LOCKED]: "Account has been locked",
  [ErrorCode.ACCOUNT_DISABLED]: "Account has been disabled",
  [ErrorCode.PASSWORD_EXPIRED]: "Password has expired and needs to be reset",
  
  // Login Specific Errors
  [ErrorCode.LOGIN_EMAIL_NOT_FOUND]: "Email not found or account not registered",
  [ErrorCode.LOGIN_INVALID_PASSWORD]: "Invalid password provided",
  [ErrorCode.LOGIN_ACCOUNT_INACTIVE]: "Account is inactive or disabled",
  [ErrorCode.LOGIN_ACCOUNT_PENDING_VERIFICATION]: "Account requires email verification",
  [ErrorCode.LOGIN_ACCOUNT_SUSPENDED]: "Account has been suspended or blocked",
  [ErrorCode.LOGIN_PASSWORD_HASH_ERROR]: "Internal password verification error",
  
  // Password Reset Errors
  [ErrorCode.PASSWORD_RESET_EMAIL_NOT_FOUND]: "Email address not found in system",
  [ErrorCode.PASSWORD_RESET_INVALID_OTP]: "Invalid OTP code provided",
  [ErrorCode.PASSWORD_RESET_OTP_EXPIRED]: "OTP code has expired, please request a new one",
  [ErrorCode.PASSWORD_RESET_OTP_MAX_ATTEMPTS]: "Maximum OTP attempts exceeded, please try again later",
  [ErrorCode.PASSWORD_RESET_NEW_PASSWORD_WEAK]: "New password does not meet security requirements",
  [ErrorCode.PASSWORD_RESET_OTP_GENERATION_FAILED]: "Failed to generate OTP, please try again",
  
  // Validation Errors
  [ErrorCode.VALIDATION_EMAIL_REQUIRED]: "Email address is required",
  [ErrorCode.VALIDATION_EMAIL_INVALID]: "Invalid email format provided",
  [ErrorCode.VALIDATION_PASSWORD_REQUIRED]: "Password is required",
  [ErrorCode.VALIDATION_PASSWORD_WEAK]: "Password does not meet security requirements",
  [ErrorCode.VALIDATION_OTP_REQUIRED]: "OTP code is required",
  [ErrorCode.VALIDATION_OTP_INVALID_FORMAT]: "OTP must be a 6-digit number",
  [ErrorCode.VALIDATION_FULLNAME_REQUIRED]: "Full name is required",
  [ErrorCode.VALIDATION_WALLET_ADDRESS_REQUIRED]: "Wallet address is required",
  [ErrorCode.VALIDATION_WALLET_ADDRESS_INVALID]: "Invalid wallet address format",
  [ErrorCode.VALIDATION_MISSING_FIELDS]: "Required fields are missing",
  
  // User Related Errors
  [ErrorCode.USER_NOT_FOUND]: "User not found",
  [ErrorCode.USER_ALREADY_EXISTS]: "User already exists",
  [ErrorCode.USER_CREATION_FAILED]: "Failed to create user",
  [ErrorCode.USER_UPDATE_FAILED]: "Failed to update user",
  [ErrorCode.USER_DELETION_FAILED]: "Failed to delete user",
  [ErrorCode.INVALID_USER_DATA]: "Invalid user data provided",

  // DeFi Data API Specific Errors
  [ErrorCode.INVALID_INPUT]: "Invalid input provided",
  [ErrorCode.QUOTA_EXCEEDED]: "API quota exceeded",
  [ErrorCode.RATE_LIMITED]: "Request rate limit exceeded",

  [ErrorCode.EXTERNAL_API_ERROR]: "External API error occurred",

  // AI/ML Related Errors
  [ErrorCode.INVALID_AI_RESPONSE]: "Invalid AI response received",
  [ErrorCode.AI_MODEL_NOT_FOUND]: "AI model not found",
  [ErrorCode.AI_MODEL_LOAD_FAILED]: "Failed to load AI model",
  [ErrorCode.AI_MODEL_TIMEOUT]: "AI model request timeout",
  [ErrorCode.AI_RESPONSE_FORMAT_ERROR]: "AI response format error",
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: "AI service unavailable",
};