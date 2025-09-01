// File: src/services/auth/authService.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { PrismaClient, UserStatus } from "@prisma/client";
import { AppError } from "../../middleware/e/AppError.js";
import { SECURITY_CONFIG } from "../../middleware/security/securityConfig.js";
import { OtpService } from "../otp/otpService.js";
import { OTPType } from "../../types/otpTypes.js";
import { EmailService } from "../email/emailService.js";
import { PasswordUtils } from "../../utils/helpers/passwordUtils.js";
import {
  USER_STATUS_CONSTANTS,
  getUserStatusMessage,
  isValidStatusForLogin,
  needsVerification,
  RegisterDto,
  LoginResult,
  VerificationResult,
} from "../../types/authTypes.js";

const prisma = new PrismaClient();

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

    // Create user in transaction
    await prisma.$transaction(async (tx) => {
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
    });

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

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(email, fullName);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
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
    };
  }

  static async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, subscription: true },
    });

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Validate password - support both Argon2id and bcrypt
    let isValidPassword = false;
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
          console.error("Failed to upgrade password hash:", error);
          // Don't fail login if hash upgrade fails
        }
      }
    } else {
      throw AppError.internalError("Invalid password hash format");
    }

    if (!isValidPassword) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Check user status
    this.validateUserStatus(user.status);

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
        email: user.email,
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
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token signature
      const secret = (process.env.JWT_REFRESH_SECRET || SECURITY_CONFIG.JWT.SECRET) as string;
      const decoded = jwt.verify(refreshToken, secret) as { userId: string };
      
      // Find user and verify stored refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true, subscription: true }
      });

      if (!user || !user.refreshToken) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      // Verify against stored hashed refresh token
      const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValidRefreshToken) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      // Check user status
      this.validateUserStatus(user.status);

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid refresh token');
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
      data: { refreshToken: null }
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
}

// Interface definitions moved to authTypes.ts
