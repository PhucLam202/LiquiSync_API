// File: src/controllers/apiKeyController.ts
import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey/apiKeyService.js';
import { AppError } from '../middleware/e/AppError.js';
import { ValidationUtils, ValidationMiddleware } from '../utils/helpers/validators.js';

export class ApiKeyController {
  /**
   * Create a new API key
   */
  static async createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { name, permissions, allowedIPs, refererUrls, expiresAt } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Validate required fields
      const requiredFields = ['name'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate field lengths
      const lengthErrors = ValidationMiddleware.validateLengths(req.body, {
        name: { min: 1, max: 100 }
      });
      if (lengthErrors.length > 0) {
        throw AppError.badRequest(lengthErrors.join(', '));
      }

      // Validate IP addresses if provided
      if (allowedIPs && Array.isArray(allowedIPs)) {
        for (const ip of allowedIPs) {
          if (!ValidationUtils.isValidIP(ip)) {
            throw AppError.badRequest(`Invalid IP address: ${ip}`);
          }
        }
      }

      // Validate domains if provided
      if (refererUrls && Array.isArray(refererUrls)) {
        for (const domain of refererUrls) {
          if (!ValidationUtils.isValidDomain(domain)) {
            throw AppError.badRequest(`Invalid domain: ${domain}`);
          }
        }
      }

      // Validate expiration date if provided
      if (expiresAt && !ValidationUtils.isValidDate(expiresAt)) {
        throw AppError.badRequest('Invalid expiration date');
      }

      const keyData = {
        name: ValidationUtils.sanitizeInput(name),
        permissions: permissions || [],
        allowedIPs: allowedIPs || [],
        refererUrls: refererUrls || [],
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      };

      const result = await ApiKeyService.createApiKey(user.id, keyData);

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's API keys
   */
  static async getUserApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const apiKeys = await ApiKeyService.getUserApiKeys(user.id);

      res.status(200).json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { keyId } = req.params;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      if (!keyId) {
        throw AppError.badRequest('API key ID is required');
      }

      // Validate keyId format (MongoDB ObjectId)
      if (!ValidationUtils.isValidObjectId(keyId)) {
        throw AppError.badRequest('Invalid API key ID format');
      }

      await ApiKeyService.revokeApiKey(user.id, keyId);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { keyId } = req.params;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      if (!keyId) {
        throw AppError.badRequest('API key ID is required');
      }

      // Validate keyId format
      if (!ValidationUtils.isValidObjectId(keyId)) {
        throw AppError.badRequest('Invalid API key ID format');
      }

      // TODO: Implement API key usage statistics
      // This would fetch usage data from the database

      res.status(200).json({
        success: true,
        message: 'API key usage statistics not yet implemented',
        data: {
          keyId,
          totalRequests: 0,
          requestsThisMonth: 0,
          averageResponseTime: 0,
          lastUsed: null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API key settings
   */
  static async updateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { keyId } = req.params;
      const { name, allowedIPs, refererUrls, expiresAt } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      if (!keyId) {
        throw AppError.badRequest('API key ID is required');
      }

      // Validate keyId format
      if (!ValidationUtils.isValidObjectId(keyId)) {
        throw AppError.badRequest('Invalid API key ID format');
      }

      // Validate IP addresses if provided
      if (allowedIPs && Array.isArray(allowedIPs)) {
        for (const ip of allowedIPs) {
          if (!ValidationUtils.isValidIP(ip)) {
            throw AppError.badRequest(`Invalid IP address: ${ip}`);
          }
        }
      }

      // Validate domains if provided
      if (refererUrls && Array.isArray(refererUrls)) {
        for (const domain of refererUrls) {
          if (!ValidationUtils.isValidDomain(domain)) {
            throw AppError.badRequest(`Invalid domain: ${domain}`);
          }
        }
      }

      // TODO: Implement API key update logic
      // This would update the API key settings in the database

      res.status(200).json({
        success: true,
        message: 'API key updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}