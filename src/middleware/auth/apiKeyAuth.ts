// File: src/middleware/auth/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { AppError } from '../e/AppError.js';
import { SECURITY_CONFIG } from '../security/securityConfig.js';
import { prisma } from '../../config/database.js';


interface AuthenticatedRequest extends Request {
  user?: any;
  apiKey?: any;
  userPermissions?: string[];
  userRole?: string;
}

export const apiKeyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      throw AppError.unauthorized('API key required');
    }

    // Validate API key format
    if (!apiKey.startsWith(SECURITY_CONFIG.API_KEY.PREFIX)) {
      throw AppError.unauthorized('Invalid API key format');
    }

    // Hash the API key for database lookup
    const keyHash = createHash(SECURITY_CONFIG.API_KEY.HASH_ALGORITHM)
      .update(apiKey)
      .digest('hex');
    // Fetch API key with user context
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { 
        user: { 
          include: { 
            subscription: true,
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          } 
        } 
      }
    });

    // Validate API key and user status
    if (!apiKeyRecord?.isActive || !apiKeyRecord.user.isActive) {
      await logSecurityEvent('INVALID_API_KEY', req.ip || 'unknown', { 
        keyPrefix: apiKey.substring(0, 12) 
      });
      throw AppError.unauthorized('Invalid or inactive API key');
    }

    // Check API key expiration
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('API key expired');
    }

    // Validate IP whitelist if configured
    if (apiKeyRecord.allowedIPs.length > 0) {
      const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
      if (!apiKeyRecord.allowedIPs.includes(clientIP)) {
        await logSecurityEvent('IP_NOT_WHITELISTED', clientIP, {
          userId: apiKeyRecord.userId,
          allowedIPs: apiKeyRecord.allowedIPs
        });
        throw AppError.forbidden('IP address not authorized');
      }
    }

    // Validate referer if configured
    const referer = req.get('Referer');
    if (referer && apiKeyRecord.refererUrls.length > 0) {
      const refererDomain = new URL(referer).hostname;
      if (!apiKeyRecord.refererUrls.some((url: string) => refererDomain.includes(url))) {
        await logSecurityEvent('REFERER_NOT_ALLOWED', req.ip || 'unknown', {
          referer,
          allowedReferers: apiKeyRecord.refererUrls
        });
        throw AppError.forbidden('Referer domain not authorized');
      }
    }

    // Check subscription usage limits
    const subscription = apiKeyRecord.user.subscription;
    if (subscription.currentUsage >= subscription.monthlyLimit) {
      throw AppError.rateLimited(
        `Monthly API limit exceeded. Resets on ${subscription.resetDate.toISOString()}`
      );
    }

    // Extract permissions from role and API key
    const rolePermissions = apiKeyRecord.user.role.rolePermissions
      .map((rp: any) => rp.permission.name);
    const allPermissions = [...new Set([
      ...rolePermissions,
      ...apiKeyRecord.permissions
    ])];

    // Update usage statistics asynchronously
    updateUsageStats(apiKeyRecord, req).catch(error =>
      console.error('Failed to update usage stats:', error)
    );

    // Attach context to request
    req.user = apiKeyRecord.user;
    req.apiKey = apiKeyRecord;
    req.userPermissions = allPermissions;
    req.userRole = apiKeyRecord.user.role.name;

    next();
  } catch (error) {
    next(error);
  }
};

// SECURITY FIX: Only allow secure header-based API key transmission
function extractApiKey(req: Request): string | null {
  // Check secure headers only (no query parameters)
  const headers = SECURITY_CONFIG.API_KEY.ALLOWED_HEADERS
    .map(header => {
      if (header === 'Authorization') {
        return req.get(header)?.replace('Bearer ', '');
      }
      return req.get(header);
    })
    .filter(Boolean);

  return headers[0] || null;
}

async function updateUsageStats(apiKeyRecord: any, req: Request) {
  const timestamp = new Date();
  
  await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { 
        lastUsedAt: timestamp,
        requestCount: { increment: 1 }
      }
    }),
    prisma.subscription.update({
      where: { id: apiKeyRecord.user.subscriptionId },
      data: { currentUsage: { increment: 1 } }
    }),
    prisma.usageLog.create({
      data: {
        userId: apiKeyRecord.userId,
        apiKeyId: apiKeyRecord.id,
        endpoint: req.path,
        method: req.method,
        statusCode: 0,
        responseTime: 0,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp
      }
    })
  ]);
}

async function logSecurityEvent(eventType: string, ip: string, metadata: any) {
  console.warn(`Security event: ${eventType}`, { ip, metadata });
  // Additional security logging implementation
}