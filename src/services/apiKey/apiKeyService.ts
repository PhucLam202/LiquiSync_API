// File: src/services/apiKey/apiKeyService.ts
import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/e/AppError.js';
import { SECURITY_CONFIG } from '../../middleware/security/securityConfig.js';

const prisma = new PrismaClient();

export class ApiKeyService {
  static async createApiKey(userId: string, keyData: CreateApiKeyDto): Promise<ApiKeyResult> {
    // Validate user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user || !user.isActive) {
      throw AppError.badRequest('User not found or inactive');
    }

    // Check API key limits based on subscription
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId, isActive: true }
    });

    const maxKeys = this.getMaxApiKeys(user.subscription.planType);
    if (existingKeysCount >= maxKeys) {
      throw AppError.badRequest(`Maximum ${maxKeys} API keys allowed for ${user.subscription.planType} plan`);
    }

    // Generate API key
    const rawKey = this.generateApiKey();
    const keyHash = createHash(SECURITY_CONFIG.API_KEY.HASH_ALGORITHM)
      .update(rawKey)
      .digest('hex');

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        keyPrefix: rawKey.substring(0, 12),
        name: keyData.name,
        permissions: keyData.permissions || [],
        allowedIPs: keyData.allowedIPs || [],
        refererUrls: keyData.refererUrls || [],
        expiresAt: keyData.expiresAt
      }
    });

    return {
      id: apiKey.id,
      key: rawKey, // Only returned once during creation
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt
    };
  }

  static async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId }
    });

    if (!apiKey) {
      throw AppError.notFound('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false }
    });
  }

  static async getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        requestCount: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiKeys;
  }

  private static generateApiKey(): string {
    const randomPart = randomBytes(SECURITY_CONFIG.API_KEY.LENGTH).toString('hex');
    return `${SECURITY_CONFIG.API_KEY.PREFIX}${randomPart}`;
  }

  private static getMaxApiKeys(planType: string): number {
    const limits = {
      FREE: 1,
      STARTER: 3,
      PROFESSIONAL: 10,
      ENTERPRISE: 50
    };
    return limits[planType as keyof typeof limits] || 1;
  }
}

interface CreateApiKeyDto {
  name: string;
  permissions?: string[];
  allowedIPs?: string[];
  refererUrls?: string[];
  expiresAt?: Date;
}

interface ApiKeyResult {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  createdAt: Date;
}

interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  lastUsedAt: Date | null;
  requestCount: number;
  createdAt: Date;
  expiresAt: Date | null;
}