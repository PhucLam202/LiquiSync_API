// File: src/middleware/auth/jwtAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../e/AppError.js';
import { SECURITY_CONFIG } from '../security/securityConfig.js';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
  userRole?: string;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens from Authorization header
 */
export const jwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req);
    
    if (!token) {
      throw AppError.unauthorized('Access token required');
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET || SECURITY_CONFIG.JWT.SECRET;
    if (!secret) {
      throw AppError.internalError('JWT configuration error');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Token expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw AppError.unauthorized('Invalid token');
      } else {
        throw AppError.unauthorized('Token verification failed');
      }
    }

    // Fetch user with latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        },
        subscription: true
      }
    });

    // Validate user exists and is active
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account is inactive');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Account is not fully activated');
    }

    // Extract permissions
    const permissions = user.role.rolePermissions
      .map(rp => rp.permission.name);

    // Attach user data to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role.name;
    (req as any).userPermissions = permissions;

    console.log(`✅ JWT Auth successful for user: ${user.email}`);
    next();

  } catch (error) {
    console.error('❌ JWT Auth failed:', error);
    next(error);
  }
};

/**
 * Optional JWT Auth - doesn't fail if no token
 * Useful for routes that work both with and without auth
 */
export const optionalJwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    
    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // If token is provided, validate it
    await jwtAuth(req, res, next);
  } catch (error) {
    // If token is invalid, continue without authentication
    console.warn('⚠️ Optional JWT auth failed, continuing without auth:', error);
    next();
  }
};

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const matches = authHeader.match(/^Bearer\s+(.+)$/);
  return matches ? matches[1] : null;
}

/**
 * Middleware to require specific roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.userRole)) {
      throw AppError.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

/**
 * Middleware to require user to own the resource
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.userId !== resourceUserId && req.userRole !== 'ADMIN') {
      throw AppError.forbidden('Access denied. You can only access your own resources');
    }

    next();
  };
}; 