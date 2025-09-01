// File: src/services/email/brevo/brevoService.ts
import { EmailTemplate } from '../emailService.js';

export class BrevoService {
  private apiKey: string;
  private baseUrl = 'https://api.brevo.com/v3';

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BREVO_API_KEY environment variable is required');
    }
  }

  async sendTemplateEmail(emailData: EmailTemplate): Promise<void> {
    try {
      console.log('🔄 BrevoService: Preparing to send email', {
        to: emailData.to,
        template: emailData.template,
        subject: emailData.subject
      });

      // Validate template variables
      this.validateTemplateVariables(emailData);

      // Get template ID - if no templates exist, send as HTML email instead
      const templateId = this.getTemplateId(emailData.template);
      const requestBody = this.buildEmailRequest(emailData, templateId ?? undefined);

      console.log('📦 BrevoService: Request payload', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📊 BrevoService: Response status', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.log('❌ BrevoService: Error response', error);
        
        // If template not found, try sending as HTML email
        if (error.includes('template') || error.includes('not found')) {
          console.log('🔄 BrevoService: Attempting to send as HTML email instead');
          return await this.sendHtmlEmail(emailData);
        }
        
        throw new Error(`Brevo API error: ${error}`);
      }

      const responseData = await response.json();
      console.log('✅ BrevoService: Email sent successfully', responseData);

    } catch (error) {
      console.error('❌ BrevoService: Failed to send email via Brevo:', error);
      throw error;
    }
  }

  private buildEmailRequest(emailData: EmailTemplate, templateId?: number): any {
    const baseRequest = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'DeFi Data API',
        email: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com'
      },
      to: [{ email: emailData.to }],
      subject: emailData.subject
    };

    // If template ID is available and > 0, use template
    if (templateId && templateId > 0) {
      return {
        ...baseRequest,
        templateId,
        params: emailData.variables
      };
    }

    // Otherwise, send as HTML email
    return {
      ...baseRequest,
      htmlContent: this.generateHtmlContent(emailData)
    };
  }

  private async sendHtmlEmail(emailData: EmailTemplate): Promise<void> {
    const requestBody = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'DeFi Data API',
        email: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com'
      },
      to: [{ email: emailData.to }],
      subject: emailData.subject,
      htmlContent: this.generateHtmlContent(emailData)
    };

    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo HTML email error: ${error}`);
    }
  }

  private generateHtmlContent(emailData: EmailTemplate): string {
    const { template, variables } = emailData;
    
    // Generate HTML based on template type
    switch (template) {
      case 'signup_verification':
      case 'email_verification':
      case 'generic_otp':
        return `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <title>Email Verification</title>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                  .content { padding: 30px; background: #f9f9f9; }
                  .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; 
                             background: white; padding: 20px; border: 2px dashed #007bff; margin: 20px 0; }
                  .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>Email Verification</h1>
                  </div>
                  <div class="content">
                      <h2>Your verification code:</h2>
                      <div class="otp-code">${variables.otp_code || 'N/A'}</div>
                      <p>This code will expire in <strong>${variables.expires_in || '5 minutes'}</strong></p>
                      <p>If you didn't request this code, please ignore this email.</p>
                  </div>
                  <div class="footer">
                      <p>© ${new Date().getFullYear()} DeFi Data API. All rights reserved.</p>
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
              <title>Welcome</title>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                  .content { padding: 30px; background: #f9f9f9; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>Welcome to DeFi Data API!</h1>
                  </div>
                  <div class="content">
                      <h2>Hello ${variables.full_name || 'User'}!</h2>
                      <p>Thank you for joining DeFi Data API. Your account is now active.</p>
                      <p>You can start using our API at: <strong>${variables.api_url || 'https://api.yourdomain.com'}</strong></p>
                  </div>
              </div>
          </body>
          </html>
        `;

      default:
        return `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h2>${emailData.subject}</h2>
              <p>Your code: <strong>${variables.otp_code || 'N/A'}</strong></p>
              <p>Expires in: ${variables.expires_in || '5 minutes'}</p>
            </body>
          </html>
        `;
    }
  }

  private getTemplateId(templateName: string): number | null {
    // Map template names to Brevo template IDs
    const templateMap: Record<string, number> = {
      'email_verification': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2,
      'password_reset': Number(process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID) || 3,
      'login_2fa': Number(process.env.BREVO_LOGIN_2FA_TEMPLATE_ID) || 4,
      'welcome': Number(process.env.BREVO_WELCOME_TEMPLATE_ID) || 0,
      'signup_verification': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2, // Use same as email_verification
      'generic_otp': Number(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2 // Use same as email_verification
    };

    const templateId = templateMap[templateName] || 0;
    console.log(`🔍 BrevoService: Template mapping - ${templateName} -> ${templateId}`);
    
    // Return null if template ID is 0 (not configured) 
    return templateId > 0 ? templateId : null;
  }

  private validateTemplateVariables(emailData: EmailTemplate): void {
    const { template, variables } = emailData;
    
    // Required variables for each template type
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
      console.warn(`⚠️ BrevoService: Missing variables for ${template}:`, missing);
    }
  }
}