// File: src/middleware/validation/inputValidation.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../e/AppError.js';
import { ValidationUtils } from '../../utils/helpers/validators.js';

export class InputValidationMiddleware {
  /**
   * Validate and sanitize all request inputs
   */
  static sanitizeInputs() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize query parameters
        if (req.query) {
          for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
              req.query[key] = ValidationUtils.sanitizeInput(value);
            }
          }
        }

        // Sanitize request body (except passwords and binary data)
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body, ['password', 'newPassword', 'currentPassword']);
        }

        // Sanitize URL parameters
        if (req.params) {
          for (const [key, value] of Object.entries(req.params)) {
            if (typeof value === 'string') {
              req.params[key] = ValidationUtils.sanitizeInput(value);
            }
          }
        }

        next();
      } catch (error) {
        next(AppError.badRequest('Input validation failed'));
      }
    };
  }

  /**
   * Prevent SQL injection attacks
   */
  static preventSqlInjection() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const checkSqlInjection = (obj: any, path: string = ''): void => {
          if (typeof obj === 'string') {
            if (ValidationUtils.containsSqlInjection(obj)) {
              throw AppError.badRequest(`Potentially malicious input detected in ${path || 'request'}`);
            }
          } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
              checkSqlInjection(value, path ? `${path}.${key}` : key);
            }
          }
        };

        // Check all request inputs
        checkSqlInjection(req.query, 'query');
        checkSqlInjection(req.body, 'body');
        checkSqlInjection(req.params, 'params');

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Prevent path traversal attacks
   */
  static preventPathTraversal() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const checkPathTraversal = (obj: any, path: string = ''): void => {
          if (typeof obj === 'string') {
            if (ValidationUtils.containsPathTraversal(obj)) {
              throw AppError.badRequest(`Path traversal attempt detected in ${path || 'request'}`);
            }
          } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
              checkPathTraversal(value, path ? `${path}.${key}` : key);
            }
          }
        };

        // Check all request inputs
        checkPathTraversal(req.query, 'query');
        checkPathTraversal(req.body, 'body');
        checkPathTraversal(req.params, 'params');

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate request content size
   */
  static limitRequestSize(maxSizeKB: number = 100) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const contentLength = parseInt(req.get('Content-Length') || '0', 10);
        const maxSizeBytes = maxSizeKB * 1024;

        if (contentLength > maxSizeBytes) {
          throw AppError.badRequest(`Request size exceeds limit of ${maxSizeKB}KB`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Validate specific field formats
   */
  static validateFields(fieldValidators: FieldValidator[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors: string[] = [];

        for (const validator of fieldValidators) {
          const value = this.getNestedValue(req.body, validator.field);
          
          if (value !== undefined) {
            const result = validator.validate(value);
            if (!result.isValid) {
              errors.push(`${validator.field}: ${result.message}`);
            }
          }
        }

        if (errors.length > 0) {
          throw AppError.badRequest(errors.join(', '));
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Common field validators
   */
  static commonValidators = {
    email: {
      field: 'email',
      validate: (value: any) => ({
        isValid: typeof value === 'string' && ValidationUtils.isValidEmail(value),
        message: 'must be a valid email address'
      })
    },
    password: {
      field: 'password',
      validate: (value: any) => {
        if (typeof value !== 'string') {
          return { isValid: false, message: 'must be a string' };
        }
        const result = ValidationUtils.validatePassword(value);
        return {
          isValid: result.isValid,
          message: result.errors.join(', ')
        };
      }
    },
    objectId: (field: string) => ({
      field,
      validate: (value: any) => ({
        isValid: typeof value === 'string' && ValidationUtils.isValidObjectId(value),
        message: 'must be a valid ObjectId'
      })
    }),
    url: (field: string) => ({
      field,
      validate: (value: any) => ({
        isValid: typeof value === 'string' && ValidationUtils.isValidUrl(value),
        message: 'must be a valid URL'
      })
    }),
    ipAddress: (field: string) => ({
      field,
      validate: (value: any) => ({
        isValid: typeof value === 'string' && ValidationUtils.isValidIP(value),
        message: 'must be a valid IP address'
      })
    }),
    domain: (field: string) => ({
      field,
      validate: (value: any) => ({
        isValid: typeof value === 'string' && ValidationUtils.isValidDomain(value),
        message: 'must be a valid domain name'
      })
    })
  };

  // Helper methods
  private static sanitizeObject(obj: any, excludeFields: string[] = []): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, excludeFields));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!excludeFields.includes(key)) {
          sanitized[key] = this.sanitizeObject(value, excludeFields);
        } else {
          sanitized[key] = value; // Keep excluded fields as-is
        }
      }
      return sanitized;
    }
    
    if (typeof obj === 'string') {
      return ValidationUtils.sanitizeInput(obj);
    }
    
    return obj;
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

interface FieldValidator {
  field: string;
  validate: (value: any) => ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}