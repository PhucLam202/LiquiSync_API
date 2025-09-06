// File: src/services/email/brevo/brevoService.ts
import { EmailTemplate } from '../emailService.js';
import { EmailMetricsService } from '../emailMetrics.js';
import * as SibApiV3Sdk from '@getbrevo/brevo';

interface BrevoConfig {
  apiKey: string;
  fromName: string;
  fromEmail: string;
  templates: Map<string, number>;
}

export class BrevoService {
  private static instance: BrevoService;
  private readonly apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private readonly config: BrevoConfig;
  private readonly templateCache = new Map<string, number>();

  private constructor() {
    // Load and validate configuration
    this.config = this.loadConfiguration();
    
    // Initialize Brevo SDK API instance
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      this.config.apiKey
    );

    // Initialize template cache
    this.initializeTemplateCache();
  }

  /**
   * Singleton pattern - ensures single API instance across application
   */
  static getInstance(): BrevoService {
    if (!BrevoService.instance) {
      BrevoService.instance = new BrevoService();
    }
    return BrevoService.instance;
  }

  /**
   * Optimized email sending with intelligent template handling and performance tracking
   */
  async sendTemplateEmail(emailData: EmailTemplate): Promise<void> {
    const startTime = Date.now();
    const metricsService = EmailMetricsService.getInstance();
    
    try {

      // Validate template variables
      this.validateTemplateVariables(emailData);

      // Get cached template ID for better performance
      const templateId = this.getCachedTemplateId(emailData.template);
      
      // Build optimized email request
      const sendSmtpEmail = this.buildOptimizedEmailRequest(emailData, templateId);

      // Send via Brevo SDK (with automatic connection pooling and retry logic)
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      // Record successful send with performance metrics
      const responseTime = Date.now() - startTime;
      metricsService.recordEmailSent(emailData.template, responseTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Record error in metrics
      metricsService.recordEmailError(emailData.template, errorMessage);
      
      console.error('❌ BrevoService: Email sending failed', {
        error: errorMessage,
        to: emailData.to,
        template: emailData.template,
        responseTime: `${Date.now() - startTime}ms`
      });
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Load and validate configuration with error handling
   */
  private loadConfiguration(): BrevoConfig {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      throw new Error('BREVO_API_KEY environment variable is required');
    }

    return {
      apiKey,
      fromName: process.env.BREVO_FROM_NAME || 'DeFi Data API',
      fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com',
      templates: new Map()
    };
  }

  /**
   * Initialize template cache for better performance
   */
  private initializeTemplateCache(): void {
    const templateMappings = {
      'email_verification': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2,
      'password_reset': Number(process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID) || 3,
      'login_2fa': Number(process.env.BREVO_LOGIN_2FA_TEMPLATE_ID) || 4,
      'welcome': Number(process.env.BREVO_WELCOME_TEMPLATE_ID) || 0,
      'signup_verification': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2,
      'generic_otp': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2
    };

    Object.entries(templateMappings).forEach(([template, id]) => {
      if (id > 0) {
        this.templateCache.set(template, id);
      }
    });
  }

  /**
   * Fast template ID lookup with caching
   */
  private getCachedTemplateId(templateName: string): number | null {
    const templateId = this.templateCache.get(templateName);
    return templateId || null;
  }

  /**
   * Build optimized email request using Brevo SDK objects
   */
  private buildOptimizedEmailRequest(emailData: EmailTemplate, templateId: number | null): SibApiV3Sdk.SendSmtpEmail {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Set sender information
    sendSmtpEmail.sender = {
      name: this.config.fromName,
      email: this.config.fromEmail
    };

    // Set recipients
    sendSmtpEmail.to = [{ email: emailData.to }];
    sendSmtpEmail.subject = emailData.subject;

    // Use template if available, otherwise generate HTML
    if (templateId && templateId > 0) {
      sendSmtpEmail.templateId = templateId;
      sendSmtpEmail.params = emailData.variables;
    } else {
      sendSmtpEmail.htmlContent = this.generateOptimizedHtmlContent(emailData);
    }

    return sendSmtpEmail;
  }

  /**
   * Generate optimized HTML content with improved templates
   */
  private generateOptimizedHtmlContent(emailData: EmailTemplate): string {
    const { template, variables } = emailData;
    const currentYear = new Date().getFullYear();
    
    // Base styles for consistent email rendering
    const baseStyles = `
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { 
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 8px 8px 0 0; 
        }
        .content { padding: 40px 30px; background: #f8f9fa; }
        .otp-code { 
          font-size: 36px; 
          font-weight: bold; 
          color: #007bff; 
          text-align: center; 
          background: white; 
          padding: 25px; 
          border: 3px dashed #007bff; 
          border-radius: 8px; 
          margin: 25px 0; 
          letter-spacing: 4px;
        }
        .footer { 
          padding: 20px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          background: #fff;
          border-radius: 0 0 8px 8px;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    `;

    switch (template) {
      case 'signup_verification':
      case 'email_verification':
      case 'generic_otp':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Verification</title>
              ${baseStyles}
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>🔐 Email Verification</h1>
                  </div>
                  <div class="content">
                      <h2>Your verification code:</h2>
                      <div class="otp-code">${variables.otp_code || 'N/A'}</div>
                      <p><strong>⏰ Expires in:</strong> ${variables.expires_in || '5 minutes'}</p>
                      <p>If you didn't request this code, please ignore this email.</p>
                      <p><em>This is an automated message from DeFi Data API.</em></p>
                  </div>
                  <div class="footer">
                      <p>© ${currentYear} DeFi Data API. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      case 'password_reset':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset</title>
              ${baseStyles}
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>🔑 Password Reset</h1>
                  </div>
                  <div class="content">
                      <h2>Your password reset code:</h2>
                      <div class="otp-code">${variables.otp_code || 'N/A'}</div>
                      <p><strong>⏰ Expires in:</strong> ${variables.expires_in || '5 minutes'}</p>
                      <p>Use this code to reset your password. If you didn't request this, please contact support.</p>
                  </div>
                  <div class="footer">
                      <p>© ${currentYear} DeFi Data API. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      case 'welcome':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome</title>
              ${baseStyles}
          </head>
          <body>
              <div class="container">
                  <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                      <h1>🎉 Welcome to DeFi Data API!</h1>
                  </div>
                  <div class="content">
                      <h2>Hello ${variables.full_name || 'User'}!</h2>
                      <p>Thank you for joining DeFi Data API. Your account is now active and ready to use.</p>
                      <p><strong>🚀 API Endpoint:</strong><br>
                         <code>${variables.api_url || 'https://api.yourdomain.com'}</code></p>
                      <a href="${variables.api_url}/docs" class="btn">📚 View API Documentation</a>
                      <p>Start building with our powerful DeFi data endpoints!</p>
                  </div>
                  <div class="footer">
                      <p>© ${currentYear} DeFi Data API. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `;

      default:
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${emailData.subject}</title>
              ${baseStyles}
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>${emailData.subject}</h1>
                  </div>
                  <div class="content">
                      <p><strong>Code:</strong> ${variables.otp_code || 'N/A'}</p>
                      <p><strong>Expires:</strong> ${variables.expires_in || '5 minutes'}</p>
                  </div>
                  <div class="footer">
                      <p>© ${currentYear} DeFi Data API. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `;
    }
  }

  /**
   * Validate template variables with improved error messages
   */
  private validateTemplateVariables(emailData: EmailTemplate): void {
    const { template, variables } = emailData;
    
    const requiredVars: Record<string, string[]> = {
      'email_verification': ['otp_code', 'expires_in'],
      'signup_verification': ['otp_code', 'expires_in'],
      'password_reset': ['otp_code', 'expires_in'],
      'login_2fa': ['otp_code', 'expires_in'],
      'welcome': ['full_name', 'api_url'],
      'generic_otp': ['otp_code', 'expires_in']
    };

    const required = requiredVars[template] || [];
    const missing = required.filter(key => !variables[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ BrevoService: Missing variables for template '${template}':`, missing);
    }
  }
}