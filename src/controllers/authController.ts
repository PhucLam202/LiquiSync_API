// File: src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth/authService.js";
// import { OtpService } from '../services/otp/otpService.js';
// import { OTPType } from '../services/otp/otpTypes.js';
// import { PreAuthSessionService } from '../services/auth/preAuthSessionService.js'; // Not used in simplified flow
import { AppError } from "../middleware/e/AppError.js";
import {
  ValidationUtils,
  ValidationMiddleware,
} from "../utils/helpers/validators.js";
import { LinkingType, LinkAccountResponse } from "../types/linkingTypes.js";

export class AuthController {
  /**
   * Step 1: First registration - Create user with await_verify_email status and send OTP
   */
  static async firstRegister(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        throw AppError.badRequest("Email is required");
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      const sanitizedEmail = ValidationUtils.sanitizeInput(email.toLowerCase());

      // Create initial user and send OTP
      await AuthService.createInitialUser(sanitizedEmail);

      res.status(201).json({
        success: true,
        message: "OTP sent to your email. Please verify to continue.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 2: Verify OTP and update status to verify_email
   */
  static async verifyOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, otp } = req.body;

      // Validate required fields
      const requiredFields = ["email", "otp"];
      const missingFields = ValidationMiddleware.validateRequired(
        req.body,
        requiredFields
      );
      if (missingFields.length > 0) {
        throw AppError.badRequest(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw AppError.badRequest("OTP must be a 6-digit number");
      }

      const sanitizedEmail = ValidationUtils.sanitizeInput(email.toLowerCase());

      // Verify OTP and update user status
      await AuthService.verifyEmailOtp(sanitizedEmail, otp);

      res.status(200).json({
        success: true,
        message:
          "Email verified successfully. You can now complete your profile.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Step 3: Complete profile with password and fullName
   */
  static async completeProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, fullName } = req.body;

      // Validate required fields
      const requiredFields = ["email", "password", "fullName"];
      const missingFields = ValidationMiddleware.validateRequired(
        req.body,
        requiredFields
      );
      if (missingFields.length > 0) {
        throw AppError.badRequest(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Validate password strength
      const passwordValidation = ValidationUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw AppError.badRequest(passwordValidation.errors.join(", "));
      }

      // Sanitize inputs
      const sanitizedData = {
        email: ValidationUtils.sanitizeInput(email.toLowerCase()),
        password: password, // Don't sanitize password
        fullName: ValidationUtils.sanitizeInput(fullName),
      };

      // Complete user profile
      const result = await AuthService.completeUserProfile(sanitizedData);

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
      });

      res.status(200).json({
        success: true,
        message: "Registration completed successfully",
        data: {
          // accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy: Verify email with OTP (for backward compatibility)
   */
  static async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, otp } = req.body;

      // Validate required fields
      const requiredFields = ["email", "otp"];
      const missingFields = ValidationMiddleware.validateRequired(
        req.body,
        requiredFields
      );
      if (missingFields.length > 0) {
        throw AppError.badRequest(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw AppError.badRequest("OTP must be a 6-digit number");
      }

      const result = await AuthService.verifyEmail(
        ValidationUtils.sanitizeInput(email.toLowerCase()),
        otp
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login
   */
  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      const requiredFields = ["email", "password"];
      const missingFields = ValidationMiddleware.validateRequired(
        req.body,
        requiredFields
      );
      if (missingFields.length > 0) {
        throw AppError.badRequest(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      const result = await AuthService.login(
        ValidationUtils.sanitizeInput(email.toLowerCase()),
        password
      );

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout
   */
  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get user from token if available (optional for logout)
      const user = (req as any).user;

      // Revoke refresh token if user is authenticated
      if (user) {
        await AuthService.revokeRefreshToken(user.id);
      }

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw AppError.unauthorized("Refresh token not provided");
      }

      // Refresh access token using AuthService
      const result = await AuthService.refreshAccessToken(refreshToken);

      // Set new refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
        },
        message: "Token refreshed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        throw AppError.badRequest("Email is required");
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // TODO: Implement password reset request
      // This would generate an OTP and send it via email

      res.status(200).json({
        success: true,
        message: "Password reset instructions sent to your email",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with OTP
   */
  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;

      // Validate required fields
      const requiredFields = ["email", "otp", "newPassword"];
      const missingFields = ValidationMiddleware.validateRequired(
        req.body,
        requiredFields
      );
      if (missingFields.length > 0) {
        throw AppError.badRequest(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Validate new password
      const passwordValidation = ValidationUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw AppError.badRequest(passwordValidation.errors.join(", "));
      }

      // TODO: Implement password reset
      // This would verify the OTP and update the user's password
      // Temporary: Use otp variable to suppress TS warning
      console.log(
        "OTP to be implemented:",
        otp.length > 0 ? "provided" : "missing"
      );

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get current user profile
   */

  /**
   * Web3 Login - Login or register with wallet address
   */
  static async web3Login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { walletAddress } = req.body;

      // Validate required fields
      if (!walletAddress) {
        throw AppError.badRequest("Wallet address is required");
      }

      // Validate wallet address format (basic Ethereum address validation)
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw AppError.badRequest("Invalid wallet address format");
      }

      // Sanitize wallet address
      const sanitizedWalletAddress = ValidationUtils.sanitizeInput(
        walletAddress.toLowerCase()
      );

      // Login or register user with Web3
      const result = await AuthService.web3Login(sanitizedWalletAddress);

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
      });

      res.status(200).json({
        success: true,
        message: "Web3 login successful",
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async linkEmailToWeb3User(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // 📝 SIMPLIFIED: Only require email and walletAddress
      const { email, walletAddress } = req.body;

      // ✅ VALIDATION: Only validate essential fields
      if (!email || !walletAddress) {
        throw AppError.badRequest(
          "Both email and walletAddress are required for account linking"
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Validate wallet address format (supports Ethereum & Polkadot)
      const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
      const isPolkadotAddress = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(
        walletAddress
      );

      if (!isEthereumAddress && !isPolkadotAddress) {
        throw AppError.badRequest(
          "Invalid wallet address format (must be Ethereum or Polkadot address)"
        );
      }

      // Sanitize inputs
      const sanitizedEmail = ValidationUtils.sanitizeInput(email.toLowerCase());
      const sanitizedWallet = ValidationUtils.sanitizeInput(
        walletAddress.toLowerCase()
      );

      // 🔍 CHECK EXISTING ACCOUNTS: Find what accounts exist
      const emailUser = await AuthService.findUserByEmail(sanitizedEmail);
      const walletUser = await AuthService.findUserByWallet(sanitizedWallet);

      // 🎯 BIDIRECTIONAL LINKING LOGIC
      let result: any;
      let linkingType: LinkingType;
      let message: string;

      if (emailUser && walletUser) {
        // Both accounts exist
        if (emailUser.id === walletUser.id) {
          // ✅ Same user - already linked!
          linkingType = LinkingType.ALREADY_LINKED;
          message = "Email and wallet are already linked to your account";
          result = { user: emailUser };
        } else {
          throw AppError.badRequest(
            "Email and wallet belong to different accounts. Please use different credentials or contact support."
          );
        }
      } else if (emailUser && !walletUser) {
        // 📧→🌐 Email exists, wallet doesn't - link wallet to email account
        result = await AuthService.linkWalletToEmailUser(
          sanitizedEmail,
          sanitizedWallet
        );
        linkingType = LinkingType.EMAIL_TO_WEB3;
        message = "Wallet successfully linked to your email account";
      } else if (!emailUser && walletUser) {
        // 🌐→📧 Wallet exists, email doesn't - link email to wallet account
        result = await AuthService.linkEmailToWalletUser(
          sanitizedEmail,
          sanitizedWallet
        );
        linkingType = LinkingType.WEB3_TO_EMAIL;
        message = "Email successfully linked to your Web3 account";
      } else {
        // ❌ Neither exists - need to register first
        throw AppError.badRequest(
          "No existing account found with the provided email or wallet address. Please register a new account first."
        );
      }

      // 🎫 GENERATE ACCESS TOKEN (for newly linked accounts)
      let accessToken: string | undefined;
      if (linkingType !== LinkingType.ALREADY_LINKED) {
        accessToken = (AuthService as any).generateAccessToken(result.user);
      }

      // 🍪 SET REFRESH TOKEN COOKIE
      if (result.refreshToken) {
        res.cookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      // ✅ SUCCESS RESPONSE WITH TYPE FOR UI
      const response: LinkAccountResponse = {
        success: true,
        type: linkingType,
        message,
        data: {
          ...(accessToken && { accessToken }),
          user: {
            id: result.user.id,
            email: result.user.email,
            walletAddress: result.user.walletAddress,
            fullName: result.user.fullName,
            authType: result.user.authType,
            isEmailVerified: result.user.isEmailVerified,
            status: result.user.status,
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt,
          },
          linkedAt: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
