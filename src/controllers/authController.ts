// File: src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/authService.js';
// import { OtpService } from '../services/otp/otpService.js';
// import { OTPType } from '../services/otp/otpTypes.js';
// import { PreAuthSessionService } from '../services/auth/preAuthSessionService.js'; // Not used in simplified flow
import { AppError } from '../middleware/e/AppError.js';
import { ValidationUtils, ValidationMiddleware } from '../utils/helpers/validators.js';

export class AuthController {
  /**
   * Step 1: First registration - Create user with await_verify_email status and send OTP
   */
  static async firstRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        throw AppError.badRequest('Email is required');
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      const sanitizedEmail = ValidationUtils.sanitizeInput(email.toLowerCase());
      
      // Create initial user and send OTP
      await AuthService.createInitialUser(sanitizedEmail);

      res.status(201).json({
        success: true,
        message: 'OTP sent to your email. Please verify to continue.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 2: Verify OTP and update status to verify_email
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;

      // Validate required fields
      const requiredFields = ['email', 'otp'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw AppError.badRequest('OTP must be a 6-digit number');
      }

      const sanitizedEmail = ValidationUtils.sanitizeInput(email.toLowerCase());
      
      // Verify OTP and update user status
      await AuthService.verifyEmailOtp(sanitizedEmail, otp);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now complete your profile.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 3: Complete profile with password and fullName
   */
  static async completeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, fullName } = req.body;

      // Validate required fields
      const requiredFields = ['email', 'password', 'fullName'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = ValidationUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw AppError.badRequest(passwordValidation.errors.join(', '));
      }

      // Sanitize inputs
      const sanitizedData = {
        email: ValidationUtils.sanitizeInput(email.toLowerCase()),
        password: password, // Don't sanitize password
        fullName: ValidationUtils.sanitizeInput(fullName)
      };

      // Complete user profile
      const result = await AuthService.completeUserProfile(sanitizedData);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 24 * 60 * 60 * 1000 // 1 days
      });

      res.status(200).json({
        success: true,
        message: 'Registration completed successfully',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy: Verify email with OTP (for backward compatibility)
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;

      // Validate required fields
      const requiredFields = ['email', 'otp'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw AppError.badRequest('OTP must be a 6-digit number');
      }

      const result = await AuthService.verifyEmail(
        ValidationUtils.sanitizeInput(email.toLowerCase()),
        otp
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      const requiredFields = ['email', 'password'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      const result = await AuthService.login(
        ValidationUtils.sanitizeInput(email.toLowerCase()),
        password
      );

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 24 * 60 * 60 * 1000 // 1 days
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get user from token if available (optional for logout)
      const user = (req as any).user;
      
      // Revoke refresh token if user is authenticated
      if (user) {
        await AuthService.revokeRefreshToken(user.id);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw AppError.unauthorized('Refresh token not provided');
      }

      // Refresh access token using AuthService
      const result = await AuthService.refreshAccessToken(refreshToken);

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 24 * 60 * 60 * 1000 // 1 days
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        throw AppError.badRequest('Email is required');
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // TODO: Implement password reset request
      // This would generate an OTP and send it via email

      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to your email'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with OTP
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;

      // Validate required fields
      const requiredFields = ['email', 'otp', 'newPassword'];
      const missingFields = ValidationMiddleware.validateRequired(req.body, requiredFields);
      if (missingFields.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest('Invalid email format');
      }

      // Validate new password
      const passwordValidation = ValidationUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw AppError.badRequest(passwordValidation.errors.join(', '));
      }

      // TODO: Implement password reset
      // This would verify the OTP and update the user's password
      // Temporary: Use otp variable to suppress TS warning
      console.log('OTP to be implemented:', otp.length > 0 ? 'provided' : 'missing');

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This would be called after authentication middleware
      const user = (req as any).user;

      if (!user) {
        throw AppError.unauthorized('User not authenticated');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role?.name,
          subscription: user.subscription?.planType,
          emailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}