// File: src/utils/helpers/validators.ts
export class ValidationUtils {
  /**
   * Email validation with RFC 5322 compliance
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Password strength validation
   */
  static validatePassword(password: string): PasswordValidationResult {
    const result: PasswordValidationResult = {
      isValid: false,
      errors: []
    };

    // Length check
    if (password.length < 8) {
      result.errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      result.errors.push('Password must be less than 128 characters long');
    }

    // Character type checks
    if (!/[A-Z]/.test(password)) {
      result.errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      result.errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      result.errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('Password must contain at least one special character');
    }

    // Common password checks
    const commonPasswords = ['password', '123456', 'qwerty'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      result.errors.push('Password contains common words and is not secure');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * URL validation
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * IP address validation (IPv4 and IPv6)
   */
  static isValidIP(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) {
      return true;
    }

    // IPv6 validation (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Domain name validation
   */
  static isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * API key format validation
   */
  static isValidApiKeyFormat(apiKey: string): boolean {
    // Check for expected prefixes
    const validPrefixes = ['ak_live_', 'ak_test_'];
    const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));
    
    if (!hasValidPrefix) {
      return false;
    }

    // Check total length (prefix + 64 chars)
    const expectedLength = apiKey.startsWith('ak_live_') ? 72 : 72; // 8 (prefix) + 64 (key)
    return apiKey.length === expectedLength && /^[a-zA-Z0-9_]+$/.test(apiKey);
  }

  /**
   * User input sanitization for XSS prevention
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
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
   * SQL injection prevention
   */
  static containsSqlInjection(input: string): boolean {
    const sqlInjectionPatterns = [
      /(\b(select|insert|update|delete|drop|create|alter|exec|execute|union|script)\b)/gi,
      /(--|#|\/\*|\*\/|;|\||&|\$)/,
      /('|(\\')|("|\\"))/,
      /(\b(or|and)\s+\w+\s*=\s*\w+)/gi
    ];

    return sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Path traversal prevention
   */
  static containsPathTraversal(input: string): boolean {
    const pathTraversalPatterns = [
      /\.\./,
      /[\/\\]\.{2}[\/\\]/,
      /%2e%2e/gi,
      /%252e%252e/gi,
      /\.{2}[\/\\]/
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting key validation
   */
  static isValidRateLimitKey(key: string): boolean {
    // Should contain only alphanumeric characters, colons, and hyphens
    return /^[a-zA-Z0-9:.-]+$/.test(key) && key.length <= 100;
  }

  /**
   * MongoDB ObjectId validation
   */
  static isValidObjectId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }

  /**
   * JSON validation
   */
  static isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Phone number validation (international format)
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  /**
   * Username validation
   */
  static isValidUsername(username: string): boolean {
    // 3-30 characters, alphanumeric with underscores and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Credit card number validation (Luhn algorithm)
   */
  static isValidCreditCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * File upload validation
   */
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return extension ? allowedTypes.includes(extension) : false;
  }

  /**
   * Date validation and parsing
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validation middleware helpers
export class ValidationMiddleware {
  /**
   * Validate request body against schema
   */
  static validateRequired(obj: any, requiredFields: string[]): string[] {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push(`${field} is required`);
      }
    }
    
    return errors;
  }
  /**
   * Validate field lengths
   */
  static validateLengths(obj: any, lengthSchema: Record<string, { min?: number; max?: number }>): string[] {
    const errors: string[] = [];
    
    for (const [field, constraints] of Object.entries(lengthSchema)) {
      if (obj[field] !== undefined && typeof obj[field] === 'string') {
        const length = obj[field].length;
        
        if (constraints.min !== undefined && length < constraints.min) {
          errors.push(`${field} must be at least ${constraints.min} characters long`);
        }
        
        if (constraints.max !== undefined && length > constraints.max) {
          errors.push(`${field} must be at most ${constraints.max} characters long`);
        }
      }
    }
    
    return errors;
  }
}