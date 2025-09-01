// File: src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/e/AppError.js';
import { ValidationUtils } from '../utils/helpers/validators.js';

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

      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          },
          subscription: true
        }
      });

      if (!userData) {
        throw AppError.notFound('User not found');
      }

      const permissions = userData.role.rolePermissions.map(rp => rp.permission.name);

      res.status(200).json({
        success: true,
        data: {
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role.name,
          permissions,
          subscription: {
            planType: userData.subscription.planType,
            currentUsage: userData.subscription.currentUsage,
            monthlyLimit: userData.subscription.monthlyLimit,
            resetDate: userData.subscription.resetDate
          },
          emailVerified: userData.isEmailVerified,
          status: userData.status,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt
        }
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
      const { fullName } = req.body;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      // Validate and sanitize input
      const updateData: any = {};
      
      if (fullName !== undefined) {
        if (typeof fullName !== 'string' || fullName.length < 1 || fullName.length > 100) {
          throw AppError.badRequest('Full name must be between 1 and 100 characters');
        }
        updateData.fullName = ValidationUtils.sanitizeInput(fullName);
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        include: {
          role: true,
          subscription: true
        }
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role.name,
          subscription: updatedUser.subscription.planType
        }
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