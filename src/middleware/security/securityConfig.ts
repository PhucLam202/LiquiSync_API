// File: src/middleware/security/securityConfig.ts
export const SECURITY_CONFIG = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    ALGORITHM: 'HS256',
    ISSUER: 'defi-api',
    // CRITICAL FIX: No fallback for JWT secret
    SECRET: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET environment variable is required');
    })()
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    BCRYPT_ROUNDS: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
  },
  OTP: {
    LENGTH: 6,
    EXPIRY_SECONDS: 300, // 5 minutes
    MAX_ATTEMPTS: 3,
    BLOCK_DURATION: 900 // 15 minutes
  },
  API_KEY: {
    LENGTH: 32,
    PREFIX: 'ak_live_',
    HASH_ALGORITHM: 'sha256',
    // SECURITY FIX: No query parameter support
    ALLOWED_HEADERS: ['USER_API', 'X-API-Key', 'Authorization']
  },
  RATE_LIMITING: {
    WINDOW_MS: 60 * 1000, // 1 minute
    FREE_TIER: 20,
    STARTER_TIER: 100,
    PROFESSIONAL_TIER: 500,
    ENTERPRISE_TIER: 1000
  }
};