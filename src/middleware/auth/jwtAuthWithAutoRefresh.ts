// File: src/middleware/auth/jwtAuthWithAutoRefresh.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../e/AppError.js';
import { SECURITY_CONFIG } from '../security/securityConfig.js';
import { AuthService } from '../../services/auth/authService.js';

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
 * Enhanced JWT Authentication Middleware with Auto-Refresh
 * Automatically refreshes access tokens when expired if refresh token is valid
 */
export const jwtAuthWithAutoRefresh = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const accessToken = extractBearerToken(req);
    
    if (!accessToken) {
      throw AppError.unauthorized('Access token required');
    }

    const secret = process.env.JWT_SECRET || SECURITY_CONFIG.JWT.SECRET;
    if (!secret) {
      throw AppError.internalError('JWT configuration error');
    }

    let decoded: JwtPayload | null = null;
    let isTokenExpired = false;

    try {
      // Try to verify access token
      decoded = jwt.verify(accessToken, secret) as JwtPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        isTokenExpired = true;
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw AppError.unauthorized('Invalid access token');
      } else {
        throw AppError.unauthorized('Token verification failed');
      }
    }

    // If token is expired, try to refresh it automatically
    if (isTokenExpired) {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        throw AppError.unauthorized('Access token expired and no refresh token provided');
      }

      try {
        // Attempt to refresh the access token
        const refreshResult = await AuthService.refreshAccessToken(refreshToken);
        
        // Set new refresh token cookie
        res.cookie('refreshToken', refreshResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
        });

        // Add new access token to response headers for client to update
        res.setHeader('X-New-Access-Token', refreshResult.accessToken);
        
        // Verify the new access token
        decoded = jwt.verify(refreshResult.accessToken, secret) as JwtPayload;
                
      } catch (refreshError) {
        console.error('❌ Auto-refresh failed:', refreshError);
        throw AppError.unauthorized('Token expired and refresh failed. Please login again.');
      }
    }

    // Ensure we have a valid decoded token at this point
    if (!decoded) {
      throw AppError.unauthorized('Token verification failed');
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

    console.log(`✅ Auth successful for user: ${user.email}${isTokenExpired ? ' (auto-refreshed)' : ''}`);
    next();

  } catch (error) {
    console.error('❌ Auth failed:', error);
    next(error);
  }
};

/**
 * Standard JWT Auth without auto-refresh (fallback)
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