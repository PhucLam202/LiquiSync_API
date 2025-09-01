// File: src/middleware/auth/permissionAuth.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../e/AppError.js';
import { FeatureCode, FEATURE_CONFIGS } from '../../utils/constants/features.js';

interface AuthenticatedRequest extends Request {
  user?: any;
  userPermissions?: string[];
  userRole?: string;
}

export const requirePermissions = (requiredPermissions: string[], requireAll: boolean = false) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userPermissions) {
      throw AppError.unauthorized('Authentication required');
    }

    const hasPermission = requireAll
      ? requiredPermissions.every(perm => req.userPermissions!.includes(perm))
      : requiredPermissions.some(perm => req.userPermissions!.includes(perm));

    if (!hasPermission) {
      throw AppError.forbidden(
        `Insufficient permissions. Required: ${requiredPermissions.join(requireAll ? ' and ' : ' or ')}`
      );
    }

    next();
  };
};

export const requireFeature = (featureCode: FeatureCode) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const featureConfig = FEATURE_CONFIGS[featureCode];
    if (!featureConfig || !featureConfig.isActive) {
      throw AppError.forbidden('Feature not available');
    }

    // Check subscription plan
    const userPlanType = req.user.subscription.planType;
    const planHierarchy = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };
    
    if (planHierarchy[userPlanType as keyof typeof planHierarchy] < planHierarchy[featureConfig.requiredPlanType as keyof typeof planHierarchy]) {
      throw AppError.paymentRequired(
        `This feature requires ${featureConfig.requiredPlanType} subscription or higher`
      );
    }

    // Check permissions
    const hasAllRequiredPerms = featureConfig.requiredPermissions
      .every(perm => req.userPermissions?.includes(perm));
    
    if (!hasAllRequiredPerms) {
      throw AppError.forbidden(
        `Feature requires permissions: ${featureConfig.requiredPermissions.join(', ')}`
      );
    }

    next();
  };
};

// Convenience middleware exports
export const requireRead = requirePermissions(['READ']);
export const requireWrite = requirePermissions(['WRITE']);
export const requireAdmin = requirePermissions(['ADMIN']);
export const requireFeatureAnalytics = requireFeature(FeatureCode.ANALYTICS);
export const requireFeatureExport = requireFeature(FeatureCode.EXPORT);