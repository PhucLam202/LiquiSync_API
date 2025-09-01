// File: src/services/otp/otpService.ts
import { PrismaClient } from '@prisma/client';
import { createHash, randomInt, randomBytes } from 'crypto';
import { SECURITY_CONFIG } from '../../middleware/security/securityConfig.js';
import { OTPType, GenerateOtpResult, OTPTypeString } from '../../types/otpTypes.js';
import { EmailService } from '../email/emailService.js';
import { RedisService } from '../redis/redisService.js';

export class OtpService {
  static async generateOtp(email: string, type: OTPType, purpose?: string): Promise<GenerateOtpResult> {
    // Generate 6-digit OTP code
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.OTP.EXPIRY_SECONDS * 1000);
    
    // Hash OTP code for storage
    const hashedCode = createHash('sha256').update(code).digest('hex');
    
    // Store OTP in Redis with expiration (simplified - no anonymous tokens)
    const redisKey = `otp:${email}:${type}`;
    await RedisService.setex(redisKey, SECURITY_CONFIG.OTP.EXPIRY_SECONDS, JSON.stringify({
      hashedCode,
      attempts: 0,
      type,
      purpose: purpose || type,
      createdAt: new Date().toISOString()
    }));

    // Send OTP via email
    await EmailService.sendOtp(email, code, type);

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt
    };
  }

  static async verifyOtp(email: string, code: string, type: OTPType): Promise<boolean> {
    const redisKey = `otp:${email}:${type}`;
    
    // Get OTP from Redis
    const otpData = await RedisService.get(redisKey);
    if (!otpData) {
      return false; // OTP expired or not found
    }

    const parsedData = JSON.parse(otpData);
    
    // Check attempts limit
    if (parsedData.attempts >= SECURITY_CONFIG.OTP.MAX_ATTEMPTS) {
      // Block further attempts
      await RedisService.setex(
        `otp_blocked:${email}:${type}`, 
        SECURITY_CONFIG.OTP.BLOCK_DURATION, 
        'blocked'
      );
      await RedisService.del(redisKey);
      return false;
    }

    // Verify OTP code
    const hashedCode = createHash('sha256').update(code).digest('hex');
    const isValid = hashedCode === parsedData.hashedCode;

    if (!isValid) {
      // Increment attempts
      parsedData.attempts++;
      await RedisService.setex(
        redisKey, 
        SECURITY_CONFIG.OTP.EXPIRY_SECONDS, 
        JSON.stringify(parsedData)
      );
      return false;
    }

    // Valid OTP - remove from Redis
    await RedisService.del(redisKey);
    return true;
  }

  static async isBlocked(email: string, type: OTPType): Promise<boolean> {
    const blockKey = `otp_blocked:${email}:${type}`;
    const blocked = await RedisService.get(blockKey);
    return blocked !== null;
  }

  private static generateOtpCode(): string {
    const min = Math.pow(10, SECURITY_CONFIG.OTP.LENGTH - 1);
    const max = Math.pow(10, SECURITY_CONFIG.OTP.LENGTH) - 1;
    return randomInt(min, max + 1).toString();
  }

  // COMMENTED OUT: Not used in simplified flow
  // /**
  //  * Generate anonymous token ID for OTP tracking
  //  * Format: otp_XXXXXXXXXXXXXXXX (anonymous, 16-char hex)
  //  */
  // private static generateAnonymousTokenId(): string {
  //   const randomHex = randomBytes(8).toString('hex'); // 16 characters
  //   return `otp_${randomHex}`;
  // }
}