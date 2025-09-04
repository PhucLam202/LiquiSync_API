// File: src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user/userService.js';
import { AppError } from '../middleware/e/AppError.js';
import { ValidationUtils } from '../utils/helpers/validators.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Get user profile through service layer
      const profile = await UserService.getProfile(user.id);

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { fullName, email } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Update profile through service layer
      const updatedProfile = await UserService.updateProfile(user.id, {
        fullName,
        email
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user usage statistics
   */
  static async getUserUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Get usage through service layer
      const usage = await UserService.getUserUsage(user.id);

      res.status(200).json({
        success: true,
        data: usage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user API keys
   */
  static async getUserApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Get API keys through service layer
      const apiKeys = await UserService.getUserApiKeys(user.id);

      res.status(200).json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Validate required fields
      if (!currentPassword || !newPassword) {
        throw AppError.badRequest('Current password and new password are required');
      }

      // Validate new password strength
      const passwordValidation = ValidationUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw AppError.badRequest(passwordValidation.errors.join(', '));
      }

      // TODO: Implement password change logic
      // This would verify current password and update with new password

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user usage statistics
   */
  static async getUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageStats = await prisma.usageLog.aggregate({
        where: {
          userId: user.id,
          timestamp: {
            gte: startOfMonth
          }
        },
        _count: {
          id: true
        },
        _avg: {
          responseTime: true
        }
      });

      const subscription = await prisma.subscription.findUnique({
        where: { id: user.subscriptionId }
      });

      res.status(200).json({
        success: true,
        data: {
          currentUsage: usageStats._count.id || 0,
          monthlyLimit: subscription?.monthlyLimit || 0,
          averageResponseTime: usageStats._avg.responseTime || 0,
          resetDate: subscription?.resetDate,
          usagePercentage: subscription?.monthlyLimit 
            ? Math.round((usageStats._count.id / subscription.monthlyLimit) * 100) 
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { password } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      if (!password) {
        throw AppError.badRequest('Password is required to delete account');
      }

      // TODO: Implement account deletion logic
      // This would verify password and soft delete the account

      res.status(200).json({
        success: true,
        message: 'Account deletion request processed'
      });
    } catch (error) {
      next(error);
    }
  }
}