// File: src/services/auth/authService.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UserStatus } from "@prisma/client";
import { AppError } from "../../middleware/e/AppError.js";
import { ErrorCode } from "../../middleware/e/ErrorCode.js";
import { SECURITY_CONFIG } from "../../middleware/security/securityConfig.js";
import { OtpService } from "../otp/otpService.js";
import { OTPType } from "../../types/otpTypes.js";
import { EmailService } from "../email/emailService.js";
import { PasswordUtils } from "../../utils/helpers/passwordUtils.js";
import { ApiKeyService } from "../apiKey/apiKeyService.js";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import {
  USER_STATUS_CONSTANTS,
  getUserStatusMessage,
  isValidStatusForLogin,
  needsVerification,
  RegisterDto,
  LoginResult,
  VerificationResult,
} from "../../types/authTypes.js";

export class AuthService {
  /**
   * Step 1: Create initial user with await_verify_email status and send OTP
   */
  static async createInitialUser(email: string): Promise<void> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // If user exists but is still awaiting verification, resend OTP
      if (existingUser.status === USER_STATUS_CONSTANTS.PENDING_VERIFICATION) {
        throw AppError.badRequest(
          "Email is already registered, you need to approve your account first"
        );
      }
    }

    // Create user in transaction with comprehensive error handling
    try {
      await prisma.$transaction(async (tx: any) => {
        // Create default subscription first
        const subscription = await tx.subscription.create({
          data: {
            planType: "FREE",
            monthlyLimit: 20,
            resetDate: this.getNextResetDate(),
          },
        });

        // Get default user role
        const userRole = await tx.role.findUnique({
          where: { name: "USER" },
        });

        if (!userRole) {
          throw AppError.internalError("Default user role not found");
        }

        // Create user with await_verify_email status
        await tx.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash: null, // No password yet
            fullName: null, // No fullName yet
            subscriptionId: subscription.id,
            roleId: userRole.id,
            status: USER_STATUS_CONSTANTS.PENDING_VERIFICATION,
            isEmailVerified: false,
            isActive: false,
          },
        });
      }, {
        timeout: 10000, // 10 second timeout
        maxWait: 5000, // Wait up to 5 seconds to acquire connection
      });
    } catch (error) {
      logger.error('Transaction failed during user creation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: email.toLowerCase()
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle specific Prisma errors
      if ((error as any)?.code === 'P2002') { // Unique constraint violation
        throw AppError.badRequest('Email already exists in system');
      } else if ((error as any)?.code === 'P2025') { // Record not found
        throw AppError.internalError('Required system data not found');
      } else {
        throw AppError.internalError('Failed to create user account');
      }
    }

    // Send OTP
    await OtpService.generateOtp(email, OTPType.SIGNUP_VERIFICATION);
  }

  /**
   * Step 2: Verify OTP and update user status to verify_email
   */
  static async verifyEmailOtp(email: string, otp: string): Promise<void> {
    // Find user with await_verify_email status
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw AppError.badRequest("User not found");
    }

    if (!needsVerification(user.status)) {
      throw AppError.badRequest("Invalid user status for email verification");
    }

    // Verify OTP
    const isValid = await OtpService.verifyOtp(
      email,
      otp,
      OTPType.SIGNUP_VERIFICATION
    );
    if (!isValid) {
      throw AppError.badRequest("Invalid or expired OTP");
    }

    // Update user status to verify_email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: USER_STATUS_CONSTANTS.EMAIL_VERIFIED,
        isEmailVerified: true,
      },
    });
  }

  /**
   * Step 3: Complete user profile with password and fullName
   */
  static async completeUserProfile(
    profileData: RegisterDto
  ): Promise<LoginResult> {
    const { email, password, fullName } = profileData;

    // Validate input
    await this.validateRegistrationData(profileData);

    // Find user with verify_email status
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, subscription: true },
    });

    if (!user) {
      throw AppError.badRequest("User not found");
    }
    if (user.status === USER_STATUS_CONSTANTS.ACTIVE) {
      throw AppError.badRequest("User already completed profile, please login");
    }
    if (user.status !== USER_STATUS_CONSTANTS.EMAIL_VERIFIED) {
      throw AppError.badRequest("Email not verified or invalid user status");
    }

    // Hash password using Argon2id
    const passwordHash = await PasswordUtils.hashPassword(password);
    
    // Complete user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        fullName,
        status: USER_STATUS_CONSTANTS.ACTIVE,
        isActive: true,
      },
      include: { role: true, subscription: true },
    });

    // Generate tokens for immediate login
    const accessToken = this.generateAccessToken(updatedUser);
    const refreshToken = await this.generateRefreshToken(updatedUser.id);

    // Automatically create default API key for new user
    let apiKeyResult = null;
    try {
      apiKeyResult = await ApiKeyService.createApiKey(updatedUser.id, {
        name: "Default API Key",
        permissions: ["READ"], // Default read-only permissions
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });
    } catch (error) {
      logger.error('Failed to create default API key during registration', { error: error instanceof Error ? error.message : 'Unknown error', userId: updatedUser.id });
      // Don't fail the registration if API key creation fails
    }

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(email, fullName);
    } catch (error) {
      logger.error('Failed to send welcome email during registration', { error: error instanceof Error ? error.message : 'Unknown error', email: email });
      // Don't fail the registration if email fails
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
      },
      apiKey: apiKeyResult ? {
        key: apiKeyResult.key,
        keyPrefix: apiKeyResult.keyPrefix,
        name: apiKeyResult.name,
        permissions: apiKeyResult.permissions
      } : null
    };
  }

  static async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, subscription: true },
    });

    // Check if user exists
    if (!user) {
      throw AppError.newError401(ErrorCode.LOGIN_EMAIL_NOT_FOUND, "User not found with provided email address");
    }

    // Check if user has password hash (for email-based auth)
    if (!user.passwordHash) {
      throw AppError.newError401(ErrorCode.LOGIN_EMAIL_NOT_FOUND, "Account exists but no password set. Please complete registration or use Web3 login.");
    }

    // Validate password - support both Argon2id and bcrypt
    let isValidPassword = false;
    try {
      if (PasswordUtils.isArgon2Hash(user.passwordHash)) {
        isValidPassword = await PasswordUtils.verifyPassword(
          password,
          user.passwordHash
        );
      } else if (PasswordUtils.isBcryptHash(user.passwordHash)) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);

        // Optionally upgrade to Argon2id on successful login
        if (isValidPassword) {
          try {
            const newHash = await PasswordUtils.hashPassword(password);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash },
            });
          } catch (error) {
            logger.error('Failed to upgrade password hash during login', { error: error instanceof Error ? error.message : 'Unknown error', userId: user.id });
            // Don't fail login if hash upgrade fails
          }
        }
      } else {
        throw AppError.newError500(ErrorCode.LOGIN_PASSWORD_HASH_ERROR, "Invalid password hash format detected");
      }
    } catch (error) {
      // Handle password verification errors
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.newError500(ErrorCode.LOGIN_PASSWORD_HASH_ERROR, "Error occurred during password verification");
    }

    if (!isValidPassword) {
      throw AppError.newError401(ErrorCode.LOGIN_INVALID_PASSWORD, "Invalid password provided");
    }

    // Check user status with specific error codes
    try {
      this.validateUserStatus(user.status);
    } catch (error) {
      if (error instanceof AppError) {
        // Add specific error codes based on user status
        if (user.status === USER_STATUS_CONSTANTS.PENDING_VERIFICATION) {
          throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_PENDING_VERIFICATION, "Account pending email verification. Please verify your email first.");
        } else if (user.status === USER_STATUS_CONSTANTS.BLOCKED) {
          throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_SUSPENDED, "Account has been blocked. Please contact support.");
        } else if (!user.isActive) {
          throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_INACTIVE, "Account is inactive. Please contact support.");
        }
      }
      throw error;
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email?.includes('@placeholder.local') ? null : user.email, // Hide placeholder emails
        fullName: user.fullName,
      },
    };
  }

  static async verifyEmail(
    email: string,
    otp: string
  ): Promise<VerificationResult> {
    const isValid = await OtpService.verifyOtp(
      email,
      otp,
      OTPType.VERIFY_EMAIL_REGISTER
    );

    if (!isValid) {
      throw AppError.badRequest("Invalid or expired OTP");
    }

    // Update user status
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        status: USER_STATUS_CONSTANTS.ACTIVE,
        isEmailVerified: true,
        isActive: true,
      },
    });

    return {
      success: true,
      message: "Email verified successfully",
    };
  }

  // Private helper methods
  private static validateUserStatus(status: UserStatus) {
    if (!isValidStatusForLogin(status)) {
      throw AppError.forbidden(getUserStatusMessage(status));
    }
  }

  /**
   * Centralized user validation for all authentication operations
   */
  static async validateUserForAuth(userId: string, operationType: 'login' | 'general' = 'general'): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        role: true, 
        subscription: true 
      },
    });

    if (!user) {
      throw AppError.newError404(ErrorCode.USER_NOT_FOUND, "User account not found");
    }

    // Check if user is deleted
    if (user.status === USER_STATUS_CONSTANTS.DELETED) {
      throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_SUSPENDED, "Account has been deleted");
    }

    // Check if user is blocked
    if (user.status === USER_STATUS_CONSTANTS.BLOCKED) {
      throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_SUSPENDED, "Account has been blocked. Contact support");
    }

    // Check if user is active
    if (!user.isActive) {
      throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_INACTIVE, "Account is inactive. Contact support");
    }

    // For login operations, require ACTIVE status
    if (operationType === 'login' && user.status !== USER_STATUS_CONSTANTS.ACTIVE) {
      if (user.status === USER_STATUS_CONSTANTS.PENDING_VERIFICATION) {
        throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_PENDING_VERIFICATION, "Account requires email verification");
      } else {
        throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_INACTIVE, `Account status: ${user.status}`);
      }
    }

    return user;
  }

  /**
   * Validate user by email with centralized logic
   */
  static async validateUserByEmail(email: string, operationType: 'login' | 'general' = 'general'): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { 
        role: true, 
        subscription: true 
      },
    });

    if (!user) {
      if (operationType === 'login') {
        throw AppError.newError401(ErrorCode.LOGIN_EMAIL_NOT_FOUND, "Invalid credentials");
      } else {
        throw AppError.newError404(ErrorCode.USER_NOT_FOUND, "User not found with provided email");
      }
    }

    return this.validateUserForAuth(user.id, operationType);
  }

  /**
   * Validate user by wallet address with centralized logic
   */
  static async validateUserByWallet(walletAddress: string, operationType: 'login' | 'general' = 'general'): Promise<any> {
    const user = await prisma.user.findFirst({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { 
        role: true, 
        subscription: true 
      },
    });

    if (!user) {
      if (operationType === 'login') {
        throw AppError.newError401(ErrorCode.LOGIN_EMAIL_NOT_FOUND, "Invalid credentials");
      } else {
        throw AppError.newError404(ErrorCode.USER_NOT_FOUND, "User not found with provided wallet address");
      }
    }

    return this.validateUserForAuth(user.id, operationType);
  }

  private static generateAccessToken(user: any): string {
    const secret = SECURITY_CONFIG.JWT.SECRET as string;

    const options: SignOptions = {
      expiresIn: "15m",
      issuer: SECURITY_CONFIG.JWT.ISSUER,
    };

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        authType: user.authType,
        role: user.role.name,
      },
      secret,
      options
    );
  }

  private static async generateRefreshToken(userId: string): Promise<string> {
    const secret = (process.env.JWT_REFRESH_SECRET ||
      SECURITY_CONFIG.JWT.SECRET) as string;

    const options: SignOptions = {
      expiresIn: "1d",
    };

    const refreshToken = jwt.sign({ userId }, secret, options);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });

    return refreshToken;
  }

  /**
   * Verify refresh token and return new access token
   */
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token signature
      const secret = (process.env.JWT_REFRESH_SECRET ||
        SECURITY_CONFIG.JWT.SECRET) as string;
      const decoded = jwt.verify(refreshToken, secret) as { userId: string };

      // Find user and verify stored refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true, subscription: true },
      });

      if (!user || !user.refreshToken) {
        throw AppError.unauthorized("Invalid refresh token");
      }

      // Verify against stored hashed refresh token
      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken
      );
      if (!isValidRefreshToken) {
        throw AppError.unauthorized("Invalid refresh token");
      }

      // Check user status
      this.validateUserStatus(user.status);

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized("Refresh token expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized("Invalid refresh token");
      }
      throw error;
    }
  }

  /**
   * Revoke refresh token (for logout)
   */
  static async revokeRefreshToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private static getNextResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  private static async validateRegistrationData(data: RegisterDto) {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw AppError.badRequest("Invalid email format");
    }

    // Password validation
    if (data.password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
      throw AppError.badRequest(
        `Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters`
      );
    }

    // Additional password complexity checks
    if (
      SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE &&
      !/[A-Z]/.test(data.password)
    ) {
      throw AppError.badRequest(
        "Password must contain at least one uppercase letter"
      );
    }

    if (
      SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE &&
      !/[a-z]/.test(data.password)
    ) {
      throw AppError.badRequest(
        "Password must contain at least one lowercase letter"
      );
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(data.password)) {
      throw AppError.badRequest("Password must contain at least one number");
    }

    if (
      SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(data.password)
    ) {
      throw AppError.badRequest(
        "Password must contain at least one special character"
      );
    }
  }

  /**
   * Web3 Login - Login or register user with wallet address
   */
  static async web3Login(walletAddress: string): Promise<LoginResult> {
    try {
      // Normalize wallet address (lowercase)
      const normalizedAddress = walletAddress.toLowerCase();

      // Check for wallet address uniqueness (since DB constraint is removed)
      const existingUser = await prisma.user.findFirst({
        where: { walletAddress: normalizedAddress },
      });

      // Find existing user by wallet address
      let user = existingUser ? await prisma.user.findFirst({
        where: { walletAddress: normalizedAddress },
        include: { role: true, subscription: true },
      }) : null;

      // If user doesn't exist, create new user
      if (!user) {
        user = await this.createWeb3User(normalizedAddress);
        if (!user) {
          throw AppError.internalError("Failed to create Web3 user");
        }
      }

      // Validate user status
      this.validateUserStatus(user.status);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      // Automatically create default API key for new Web3 user
      let apiKeyResult = null;
      try {
        apiKeyResult = await ApiKeyService.createApiKey(user.id, {
          name: "Default Web3 API Key",
          permissions: ["READ"], // Default read-only permissions
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        });
      } catch (error) {
        logger.error('Failed to create default API key for Web3 user', { error: error instanceof Error ? error.message : 'Unknown error', userId: user.id });
        // Don't fail the login if API key creation fails
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          authType: "WEB3" as any
        },
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email?.includes('@placeholder.local') ? null : user.email, // Hide placeholder emails
          fullName: user.fullName,
          walletAddress: user.walletAddress,
          authType: user.authType,
        },
        apiKey: apiKeyResult ? {
          key: apiKeyResult.key,
          keyPrefix: apiKeyResult.keyPrefix,
          name: apiKeyResult.name,
          permissions: apiKeyResult.permissions
        } : null
      };
    } catch (error) {
      logger.error('Error in web3Login', { error: error instanceof Error ? error.message : 'Unknown error', walletAddress });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internalError("Internal server error");
    }
  }

  /**
   * Create new user for Web3 authentication
   */
  private static async createWeb3User(walletAddress: string): Promise<any> {
    return await prisma.$transaction(async (tx: any) => {
      // Create default subscription
      const subscription = await tx.subscription.create({
        data: {
          planType: "FREE",
          monthlyLimit: 20,
          resetDate: this.getNextResetDate(),
        },
      });

      // Get default user role
      const userRole = await tx.role.findUnique({
        where: { name: "USER" },
      });

      if (!userRole) {
        throw AppError.internalError("Default user role not found");
      }

      // Create user with Web3 auth type
      // Generate unique placeholder email for Web3 users to avoid unique constraint issues
      const placeholderEmail = `web3-${walletAddress.slice(-8)}@placeholder.local`;
      
      const newUser = await tx.user.create({
        data: {
          email: placeholderEmail, // Temporary unique placeholder to satisfy constraint
          walletAddress,
          authType: "WEB3",
          subscriptionId: subscription.id,
          roleId: userRole.id,
          status: USER_STATUS_CONSTANTS.ACTIVE,
          isActive: true,
          isEmailVerified: false, // Web3 users don't need email verification initially
        },
        include: { role: true, subscription: true },
      });

      return newUser;
    });
  }

  /**
   * Link email to existing Web3 user
   */
  static async linkEmailToWeb3User(
    walletAddress: string,
    email: string,
    password: string,
    fullName: string
  ): Promise<LoginResult> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const normalizedEmail = email.toLowerCase();

      // Check if email is already used by another user
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingEmailUser && existingEmailUser.walletAddress !== normalizedAddress) {
        throw AppError.badRequest("Email is already associated with another account");
      }

      // Check if wallet address is already used by another user (manual validation)
      const existingWalletUser = await prisma.user.findFirst({
        where: { 
          walletAddress: normalizedAddress,
          id: { not: existingEmailUser?.id || 'non-existent' }
        },
      });

      if (existingWalletUser) {
        throw AppError.badRequest("Wallet address is already associated with another account");
      }

      // Find Web3 user
      const user = await prisma.user.findFirst({
        where: { walletAddress: normalizedAddress },
        include: { role: true, subscription: true },
      });

      if (!user) {
        throw AppError.badRequest("Web3 user not found");
      }

      // Validate registration data
      await this.validateRegistrationData({ email, password, fullName });

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Update user with email and password
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName,
          authType: "WEB3" as any, // Keep as Web3 but now has email too
        },
        include: { role: true, subscription: true },
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(updatedUser);
      const refreshToken = await this.generateRefreshToken(updatedUser.id);

      // Create API key if user doesn't have one yet
      let apiKeyResult = null;
      try {
        const existingKeys = await prisma.apiKey.count({
          where: { userId: updatedUser.id, isActive: true }
        });
        
        if (existingKeys === 0) {
          apiKeyResult = await ApiKeyService.createApiKey(updatedUser.id, {
            name: "Default API Key",
            permissions: ["READ"], // Default read-only permissions
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          });
        }
      } catch (error) {
        logger.error('Failed to create default API key during email linking', { error: error instanceof Error ? error.message : 'Unknown error', userId: updatedUser.id });
        // Don't fail the linking if API key creation fails
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          walletAddress: updatedUser.walletAddress,
          authType: updatedUser.authType,
        },
        apiKey: apiKeyResult ? {
          key: apiKeyResult.key,
          keyPrefix: apiKeyResult.keyPrefix,
          name: apiKeyResult.name,
          permissions: apiKeyResult.permissions
        } : null
      };
    } catch (error) {
      logger.error('Error linking email to Web3 user', { error: error instanceof Error ? error.message : 'Unknown error', email, walletAddress });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internalError("Internal server error");
    }
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        role: true, 
        subscription: true 
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      walletAddress: user.walletAddress,
      authType: user.authType,
      role: user.role?.name,
      subscription: user.subscription?.planType,
      emailVerified: user.isEmailVerified,
      isActive: user.isActive,
      status: user.status,
      lastLoginAt: user.lastLoginAt
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
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw AppError.badRequest("Invalid email format");
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw AppError.badRequest("Email is already taken");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.fullName && { fullName: updateData.fullName }),
        ...(updateData.email && { email: updateData.email.toLowerCase() }),
        updatedAt: new Date()
      },
      include: { 
        role: true, 
        subscription: true 
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      walletAddress: updatedUser.walletAddress,
      authType: updatedUser.authType,
      role: updatedUser.role?.name,
      subscription: updatedUser.subscription?.planType,
      emailVerified: updatedUser.isEmailVerified,
      isActive: updatedUser.isActive,
      status: updatedUser.status,
      lastLoginAt: updatedUser.lastLoginAt
    };
  }

  // ========== IMPROVED ACCOUNT LINKING METHODS ==========

  /**
   * Find user by email address
   */
  static async findUserByEmail(email: string): Promise<any | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase(),
          status: { not: 'DELETED' }, 
          NOT: {
            email: { contains: '@placeholder.local' } // Exclude Web3 placeholder emails
          }
        },
        include: {
          subscription: true,
          role: true
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error finding user by email', { error: error instanceof Error ? error.message : 'Unknown error', email });
      return null;
    }
  }

  /**
   * Find user by wallet address
   */
  static async findUserByWallet(walletAddress: string): Promise<any | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          walletAddress: walletAddress.toLowerCase(),
          status: { not: 'DELETED' }
        },
        include: {
          subscription: true,
          role: true
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error finding user by wallet', { error: error instanceof Error ? error.message : 'Unknown error', walletAddress });
      return null;
    }
  }

  /**
   * Link wallet address to existing email user
   */
  static async linkWalletToEmailUser(email: string, walletAddress: string): Promise<any> {
    try {
      // Update email user with wallet address
      const updatedUser = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { 
          walletAddress: walletAddress.toLowerCase(),
          authType: 'HYBRID', // Both email and Web3
          updatedAt: new Date()
        },
        include: {
          subscription: true,
          role: true
        }
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(updatedUser);
      const refreshToken = await this.generateRefreshToken(updatedUser.id);

      return {
        user: updatedUser,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error linking wallet to email user', { error: error instanceof Error ? error.message : 'Unknown error', email, walletAddress });
      throw AppError.internalError('Failed to link wallet to email account');
    }
  }

  /**
   * Link email to existing wallet user
   */
  static async linkEmailToWalletUser(email: string, walletAddress: string): Promise<any> {
    try {
      // Find the wallet user first
      const walletUser = await prisma.user.findFirst({
        where: { walletAddress: walletAddress.toLowerCase() },
        include: {
          subscription: true,
          role: true
        }
      });

      if (!walletUser) {
        throw AppError.badRequest('Web3 user not found');
      }

      // Update wallet user with email
      const updatedUser = await prisma.user.update({
        where: { id: walletUser.id },
        data: { 
          email: email.toLowerCase(),
          authType: 'HYBRID', // Both email and Web3
          updatedAt: new Date()
        },
        include: {
          subscription: true,
          role: true
        }
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(updatedUser);
      const refreshToken = await this.generateRefreshToken(updatedUser.id);

      return {
        user: updatedUser,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error linking email to wallet user', { error: error instanceof Error ? error.message : 'Unknown error', email, walletAddress });
      throw AppError.internalError('Failed to link email to Web3 account');
    }
  }

  /**
   * Request password reset - Generate OTP and send email
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw AppError.newError404(ErrorCode.PASSWORD_RESET_EMAIL_NOT_FOUND, "Email address not found in system");
    }

    // Check if user is in valid state for password reset
    if (user.status === USER_STATUS_CONSTANTS.BLOCKED || user.status === USER_STATUS_CONSTANTS.DELETED) {
      throw AppError.newError403(ErrorCode.LOGIN_ACCOUNT_SUSPENDED, "Account is not eligible for password reset");
    }

    try {
      // Generate OTP for password reset
      await OtpService.generateOtp(email.toLowerCase(), OTPType.PASSWORD_RESET);
      
      logger.info('Password reset OTP sent', { email: email.toLowerCase(), userId: user.id });
    } catch (error) {
      logger.error('Failed to generate password reset OTP', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email: email.toLowerCase(),
        userId: user.id 
      });
      throw AppError.newError500(ErrorCode.PASSWORD_RESET_OTP_GENERATION_FAILED, "Failed to generate OTP, please try again");
    }
  }

  /**
   * Reset password with OTP verification
   */
  static async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw AppError.newError404(ErrorCode.PASSWORD_RESET_EMAIL_NOT_FOUND, "Email address not found in system");
    }

    // Validate new password strength
    const passwordValidation = await this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw AppError.newError400(ErrorCode.PASSWORD_RESET_NEW_PASSWORD_WEAK, passwordValidation.errors.join(", "));
    }

    // Verify OTP
    try {
      const isValidOtp = await OtpService.verifyOtp(
        email.toLowerCase(),
        otp,
        OTPType.PASSWORD_RESET
      );

      if (!isValidOtp) {
        throw AppError.newError400(ErrorCode.PASSWORD_RESET_INVALID_OTP, "Invalid or expired OTP code");
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error verifying password reset OTP', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email: email.toLowerCase(),
        userId: user.id 
      });
      throw AppError.newError400(ErrorCode.PASSWORD_RESET_INVALID_OTP, "Invalid or expired OTP code");
    }

    // Hash new password
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update password and invalidate all refresh tokens for security
    try {
      await prisma.$transaction(async (tx) => {
        // Update password
        await tx.user.update({
          where: { id: user.id },
          data: { 
            passwordHash,
            refreshToken: null, // Invalidate current refresh token for security
            updatedAt: new Date()
          },
        });
      }, {
        timeout: 10000, // 10 second timeout
        maxWait: 5000, // Wait up to 5 seconds to acquire connection
      });
    } catch (error) {
      logger.error('Transaction failed during password reset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: email.toLowerCase(),
        userId: user.id
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle specific Prisma errors
      if ((error as any)?.code === 'P2025') { // Record not found
        throw AppError.newError404(ErrorCode.USER_NOT_FOUND, 'User account no longer exists');
      } else {
        throw AppError.internalError('Failed to update password');
      }
    }

    logger.info('Password reset successfully', { email: email.toLowerCase(), userId: user.id });

    // Send confirmation email (optional - can be implemented later)
    // For now, we log the successful password reset
    // TODO: Implement sendPasswordResetConfirmation in EmailService
    // try {
    //   await EmailService.sendPasswordResetConfirmation(email.toLowerCase(), user.fullName || 'User');
    // } catch (error) {
    //   logger.error('Failed to send password reset confirmation email', { 
    //     error: error instanceof Error ? error.message : 'Unknown error', 
    //     email: email.toLowerCase() 
    //   });
    //   // Don't fail the operation if email fails
    // }
  }

  /**
   * Validate password strength with detailed feedback
   */
  private static async validatePasswordStrength(password: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Length check
    if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters long`);
    }

    // Complexity checks
    if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Additional checks
    if (password.length > 128) {
      errors.push("Password cannot exceed 128 characters");
    }

    // Check for common weak patterns
    const commonPatterns = [
      /^(.)\1+$/, // All same character
      /^(123|abc|qwerty)/i, // Common sequences
      /^(password|admin|user)/i, // Common words
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push("Password contains common weak patterns");
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

}

// Interface definitions moved to authTypes.ts
