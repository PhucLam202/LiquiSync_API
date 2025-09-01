// File: src/utils/helpers/encryption.ts
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class EncryptionUtils {
  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash a string using SHA-256
   */
  static sha256Hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Hash a string using SHA-512
   */
  static sha512Hash(input: string): string {
    return createHash('sha512').update(input).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHmac(message: string, secret: string, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, secret).update(message).digest('hex');
  }

  /**
   * Verify HMAC signature with timing-safe comparison
   */
  static verifyHmac(message: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.createHmac(message, secret, algorithm);
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    // Ensure buffers are same length to prevent timing attacks
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  /**
   * Generate API key with prefix and checksum
   */
  static generateApiKey(prefix: string = 'ak_live_'): string {
    const randomPart = randomBytes(24).toString('hex'); // 48 chars
    const timestamp = Date.now().toString(36); // Shorter timestamp encoding
    const raw = `${randomPart}${timestamp}`;
    
    // Add checksum for validation
    const checksum = createHash('sha256').update(raw).digest('hex').slice(0, 8);
    
    return `${prefix}${raw}${checksum}`;
  }

  /**
   * Validate API key format and checksum
   */
  static validateApiKeyFormat(apiKey: string, expectedPrefix: string = 'ak_live_'): boolean {
    if (!apiKey.startsWith(expectedPrefix)) {
      return false;
    }

    const keyPart = apiKey.slice(expectedPrefix.length);
    if (keyPart.length !== 64) { // 48 (random) + 8 (timestamp) + 8 (checksum)
      return false;
    }

    const raw = keyPart.slice(0, 56); // Remove checksum
    const providedChecksum = keyPart.slice(56);
    const expectedChecksum = createHash('sha256').update(raw).digest('hex').slice(0, 8);

    return timingSafeEqual(
      Buffer.from(providedChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  /**
   * Derive key using scrypt (for password-based encryption)
   */
  static async deriveKey(password: string, salt: Buffer, keyLength: number = 32): Promise<Buffer> {
    return scryptAsync(password, salt, keyLength) as Promise<Buffer>;
  }

  /**
   * Generate salt for key derivation
   */
  static generateSalt(length: number = 16): Buffer {
    return randomBytes(length);
  }

  /**
   * Constant-time string comparison
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    return timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Hash password with salt (alternative to bcrypt for specific use cases)
   */
  static async hashPassword(password: string, saltLength: number = 16): Promise<{ hash: string; salt: string }> {
    const salt = this.generateSalt(saltLength);
    const derivedKey = await this.deriveKey(password, salt, 64);
    
    return {
      hash: derivedKey.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Verify password against hash and salt
   */
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const derivedKey = await this.deriveKey(password, saltBuffer, 64);
    const derivedHash = derivedKey.toString('hex');
    
    return this.constantTimeCompare(derivedHash, hash);
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>'"&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      });
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const start = data.slice(0, visibleChars);
    const end = data.slice(-visibleChars);
    const middle = '*'.repeat(data.length - (visibleChars * 2));
    
    return `${start}${middle}${end}`;
  }
}