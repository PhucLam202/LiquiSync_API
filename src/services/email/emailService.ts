// File: src/services/email/emailService.ts
import { OTPType } from '../../types/otpTypes.js';
import { BrevoService } from './brevo/brevoService.js';

export class EmailService {
  private static emailProvider = new BrevoService();

  static async sendOtp(email: string, code: string, type: OTPType): Promise<void> {
    const subject = this.getOtpSubject(type);
    const template = this.getOtpTemplate(type);
    
    await this.emailProvider.sendTemplateEmail({
      to: email,
      subject,
      template,
      variables: {
        otp_code: code,
        expires_in: '5 minutes'
      }
    });
  }

  static async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    await this.emailProvider.sendTemplateEmail({
      to: email,
      subject: 'Welcome to DeFi Data API',
      template: 'welcome',
      variables: {
        full_name: fullName,
        api_url: process.env.API_BASE_URL || 'https://api.yourdomain.com'
      }
    });
  }

  private static getOtpSubject(type: OTPType): string {
    switch (type) {
      case OTPType.VERIFY_EMAIL_REGISTER:
        return 'Verify your email address';
      case OTPType.SIGNUP_VERIFICATION:
        return 'Complete your account registration';
      case OTPType.PASSWORD_RESET:
        return 'Reset your password';
      case OTPType.LOGIN_2FA:
        return 'Your login verification code';
      default:
        return 'Your verification code';
    }
  }

  private static getOtpTemplate(type: OTPType): string {
    switch (type) {
      case OTPType.VERIFY_EMAIL_REGISTER:
        return 'email_verification';
      case OTPType.SIGNUP_VERIFICATION:
        return 'signup_verification';
      case OTPType.PASSWORD_RESET:
        return 'password_reset';
      case OTPType.LOGIN_2FA:
        return 'login_2fa';
      default:
        return 'generic_otp';
    }
  }
}

export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}