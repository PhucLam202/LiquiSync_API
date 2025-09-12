// File: src/services/email/emailService.ts
import { OTPType } from '../../types/otpTypes.js';
import { BrevoService } from './brevo/brevoService.js';
import { EmailMetricsService, EmailMetrics } from './emailMetrics.js';

export class EmailService {
  private static brevoService: BrevoService;

  /**
   * Get singleton instance of BrevoService for optimal performance
   */
  private static getEmailProvider(): BrevoService {
    if (!EmailService.brevoService) {
      EmailService.brevoService = BrevoService.getInstance();
    }
    return EmailService.brevoService;
  }

  /**
   * Send OTP email with optimized performance and error handling
   */
  static async sendOtp(email: string, code: string, type: OTPType): Promise<void> {
    try {
      const subject = this.getOtpSubject(type);
      const template = this.getOtpTemplate(type);
      
      const emailProvider = this.getEmailProvider();
      await emailProvider.sendTemplateEmail({
        to: email,
        subject,
        template,
        variables: {
          otp_code: code,
          expires_in: '5 minutes'
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ EmailService: Failed to send OTP email', {
        email,
        type,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to send OTP email: ${errorMessage}`);
    }
  }

  /**
   * Send welcome email with enhanced template and performance
   */
  static async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    try {

      const emailProvider = this.getEmailProvider();
      await emailProvider.sendTemplateEmail({
        to: email,
        subject: 'Welcome to DeFi Data API - Your Account is Ready!',
        template: 'welcome',
        variables: {
          full_name: fullName,
          api_url: process.env.API_BASE_URL || 'https://api.yourdomain.com'
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ EmailService: Failed to send welcome email', {
        email,
        fullName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to send welcome email: ${errorMessage}`);
    }
  }

  /**
   * Send password reset email (additional method for completeness)
   */
  static async sendPasswordReset(email: string, resetCode: string): Promise<void> {
    try {
      const emailProvider = this.getEmailProvider();
      await emailProvider.sendTemplateEmail({
        to: email,
        subject: 'Password Reset - DeFi Data API',
        template: 'password_reset',
        variables: {
          otp_code: resetCode,
          expires_in: '15 minutes'
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ EmailService: Failed to send password reset email', {
        email,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to send password reset email: ${errorMessage}`);
    }
  }

  /**
   * Get subject line for OTP emails based on type
   */
  private static getOtpSubject(type: OTPType): string {
    const subjectMap: Record<OTPType, string> = {
      [OTPType.VERIFY_EMAIL_REGISTER]: '🔐 Verify Your Email Address - DeFi Data API',
      [OTPType.SIGNUP_VERIFICATION]: '🚀 Complete Your Account Registration - DeFi Data API',
      [OTPType.PASSWORD_RESET]: '🔑 Password Reset Code - DeFi Data API',
      [OTPType.LOGIN_2FA]: '🛡️ Your Login Verification Code - DeFi Data API'
    };

    return subjectMap[type] || '🔐 Your Verification Code - DeFi Data API';
  }

  /**
   * Get template name for OTP emails based on type
   */
  private static getOtpTemplate(type: OTPType): string {
    const templateMap: Record<OTPType, string> = {
      [OTPType.VERIFY_EMAIL_REGISTER]: 'email_verification',
      [OTPType.SIGNUP_VERIFICATION]: 'signup_verification',
      [OTPType.PASSWORD_RESET]: 'password_reset',
      [OTPType.LOGIN_2FA]: 'login_2fa'
    };

    return templateMap[type] || 'generic_otp';
  }

  /**
   * Health check method for monitoring
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const emailProvider = this.getEmailProvider();
      
      // Test configuration validation
      const isConfigured = process.env.BREVO_API_KEY && 
                           process.env.BREVO_FROM_EMAIL && 
                           process.env.BREVO_FROM_NAME;
      
      if (!isConfigured) {
        return {
          status: 'unhealthy',
          details: {
            error: 'Missing required environment variables',
            required: ['BREVO_API_KEY', 'BREVO_FROM_EMAIL', 'BREVO_FROM_NAME'],
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          provider: 'brevo',
          configured: true,
          singleton: !!EmailService.brevoService,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'unhealthy',
        details: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get service statistics for monitoring
   */
  static getServiceStats(): {
    provider: string;
    singletonInitialized: boolean;
    configurationStatus: string;
  } {
    return {
      provider: 'brevo',
      singletonInitialized: !!EmailService.brevoService,
      configurationStatus: process.env.BREVO_API_KEY ? 'configured' : 'missing'
    };
  }

  /**
   * Get performance metrics for monitoring and analytics
   */
  static getPerformanceMetrics(): EmailMetrics {
    const metricsService = EmailMetricsService.getInstance();
    return metricsService.getMetrics();
  }

  /**
   * Get performance summary with status and alerts
   */
  static getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'poor' | 'critical';
    metrics: EmailMetrics;
    alerts: string[];
  } {
    const metricsService = EmailMetricsService.getInstance();
    return metricsService.getPerformanceSummary();
  }

  /**
   * Reset performance metrics (useful for testing or periodic resets)
   */
  static resetMetrics(): void {
    const metricsService = EmailMetricsService.getInstance();
    metricsService.resetMetrics();
  }
}

// Export interface for type safety
export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}

// Export performance metrics interface
export interface EmailServiceMetrics {
  emailsSent: number;
  errors: number;
  averageResponseTime: number;
  lastEmailSent?: Date;
  lastError?: Date;
}