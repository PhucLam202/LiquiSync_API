// File: src/services/user/userService.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/e/AppError.js';
import { ValidationUtils } from '../../utils/helpers/validators.js';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Get user profile with detailed information
   */
  static async getProfile(userId: string): Promise<any> {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
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
        subscription: true,
        apiKeys: {
          where: { isActive: true },
          select: {
            id: true,
            keyPrefix: true,
            name: true,
            permissions: true,
            isActive: true,
            lastUsedAt: true,
            expiresAt: true,
            requestCount: true,
            createdAt: true
          }
        }
      }
    });

    if (!userData) {
      throw AppError.notFound('User not found');
    }

    const permissions = userData.role.rolePermissions.map(rp => rp.permission.name);

    return {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      walletAddress: userData.walletAddress,
      authType: userData.authType,
      role: userData.role.name,
      permissions,
      subscription: {
        planType: userData.subscription.planType,
        currentUsage: userData.subscription.currentUsage,
        monthlyLimit: userData.subscription.monthlyLimit,
        resetDate: userData.subscription.resetDate,
        status: userData.subscription.status
      },
      apiKeys: userData.apiKeys.map(key => ({
        id: key.id,
        keyPrefix: key.keyPrefix,
        name: key.name,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
      })),
      emailVerified: userData.isEmailVerified,
      isActive: userData.isActive,
      status: userData.status,
      lastLoginAt: userData.lastLoginAt
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updateData: {
    fullName?: string;
    email?: string;
  }): Promise<any> {
    // Validate input
    const validatedData: any = {};
    
    if (updateData.fullName !== undefined) {
      if (typeof updateData.fullName !== 'string' || updateData.fullName.length < 1 || updateData.fullName.length > 100) {
        throw AppError.badRequest('Full name must be between 1 and 100 characters');
      }
      validatedData.fullName = ValidationUtils.sanitizeInput(updateData.fullName);
    }

    if (updateData.email !== undefined) {
      if (!ValidationUtils.isValidEmail(updateData.email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw AppError.badRequest('Email is already taken');
      }

      validatedData.email = updateData.email.toLowerCase();
    }

    if (Object.keys(validatedData).length === 0) {
      throw AppError.badRequest('No valid fields to update');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        role: true,
        subscription: true
      }
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      walletAddress: updatedUser.walletAddress,
      authType: updatedUser.authType,
      role: updatedUser.role.name,
      subscription: updatedUser.subscription.planType,
      emailVerified: updatedUser.isEmailVerified,
      isActive: updatedUser.isActive,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt
    };
  }

  /**
   * Get user usage statistics
   */
  static async getUserUsage(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        usageLogs: {
          where: {
            timestamp: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Current month
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 100 // Last 100 requests
        }
      }
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const totalRequests = user.usageLogs.length;
    const successfulRequests = user.usageLogs.filter(log => log.statusCode >= 200 && log.statusCode < 300).length;
    const failedRequests = totalRequests - successfulRequests;

    return {
      subscription: {
        planType: user.subscription.planType,
        currentUsage: user.subscription.currentUsage,
        monthlyLimit: user.subscription.monthlyLimit,
        resetDate: user.subscription.resetDate,
        usagePercentage: Math.round((user.subscription.currentUsage / user.subscription.monthlyLimit) * 100)
      },
      usage: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0
      },
      recentActivity: user.usageLogs.map(log => ({
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        timestamp: log.timestamp
      }))
    };
  }

  /**
   * Get user API keys
   */
  static async getUserApiKeys(userId: string): Promise<any> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { 
        userId,
        isActive: true 
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      requestCount: key.requestCount,
      createdAt: key.createdAt
    }));
  }
} 