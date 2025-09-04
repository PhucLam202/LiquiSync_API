// File: src/utils/helpers/passwordUtils.ts
import { hash, verify } from '@node-rs/argon2';

export class PasswordUtils {
  // Argon2id configuration - recommended by OWASP
  private static readonly ARGON2_CONFIG = {
    memoryCost: 19456, // 19 MB
    timeCost: 2,       // 2 iterations 
    parallelism: 1,    // 1 thread
    algorithm: 'argon2id' as const,
    hashLength: 32     // 32-byte output
  };

  /**
   * Hash password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await hash(password, {
        memoryCost: this.ARGON2_CONFIG.memoryCost,
        timeCost: this.ARGON2_CONFIG.timeCost,
        parallelism: this.ARGON2_CONFIG.parallelism,
        outputLen: this.ARGON2_CONFIG.hashLength
      });
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against Argon2id hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await verify(hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Check if a hash is using Argon2id format
   */
  static isArgon2Hash(hash: string): boolean {
    return hash.startsWith('$argon2id$');
  }

  /**
   * Check if a hash is using bcrypt format
   */
  static isBcryptHash(hash: string): boolean {
    return hash.startsWith('$2b$') || hash.startsWith('$2a$') || hash.startsWith('$2y$');
  }
}