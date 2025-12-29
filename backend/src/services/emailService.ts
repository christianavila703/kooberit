import sgMail from '@sendgrid/mail';
import logger from '@/utils/logger';
import { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL } from '@/config/constants';

/**
 * Email Service using SendGrid
 */
class EmailService {
  private initialized = false;

  /**
   * Initialize SendGrid
   */
  private initialize() {
    if (!this.initialized && SENDGRID_API_KEY) {
      sgMail.setApiKey(SENDGRID_API_KEY);
      this.initialized = true;
    }
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      this.initialize();

      if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
        logger.warn('SendGrid not configured. Email not sent.');
        return;
      }

      // Validate email address
      if (!to || !to.trim()) {
        logger.warn(`Cannot send email: recipient email is empty. Subject: ${subject}`);
        return;
      }

      const trimmedTo = to.trim();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedTo)) {
        logger.warn(`Cannot send email: invalid email address "${trimmedTo}". Subject: ${subject}`);
        return;
      }

      const msg = {
        to: trimmedTo,
        from: `Kooberit <${SENDGRID_FROM_EMAIL}>`,
        subject,
        text: text || subject,
        html,
      };

      await sgMail.send(msg);
      logger.info(`Email sent to ${trimmedTo}: ${subject}`);
    } catch (error: any) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send notification to contractor about new job
   */
  async sendNewJobNotification(
    contractorEmail: string,
    contractorName: string,
    jobTitle: string,
    jobNumber: string,
    jobDescription: string,
    categories: string[],
    jobSize: string,
    location: string,
    distance: number,
    type: string
  ): Promise<void> {
    const subject = 'New Job Available Near You';
    
    // Format job size for display
    const jobSizeLabels: Record<string, string> = {
      micro: 'Micro',
      small: 'Small',
      big: 'Big',
      very_big: 'Very Big'
    };
    const formattedJobSize = jobSizeLabels[jobSize] || jobSize;
    
    // Format structure type for display
    const structureTypeLabels: Record<string, string> = {
      single_detached_house: 'Single Detached House',
      semi_detached_house: 'Semi-Detached House',
      townhouse: 'Townhouse',
      low_rise_building: 'Low-Rise Building',
      high_rise_building: 'High-Rise Building'
    };
    const formattedType = structureTypeLabels[type] || type;
    
    // Format distance similar to frontend formatDistance function
    // Round to nearest 25km increment, but minimum 25km
    const roundedDistance = Math.max(25, Math.round(distance / 25) * 25);
    const formattedDistance = `Within ${roundedDistance} km`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .job-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .job-header { border-bottom: 2px solid #0a7ea4; padding-bottom: 10px; margin-bottom: 15px; }
            .job-title { font-size: 20px; font-weight: bold; color: #0a7ea4; margin: 0 0 5px 0; }
            .job-meta { color: #666; font-size: 14px; margin: 5px 0; }
            .job-meta strong { color: #333; }
            .categories { margin-top: 10px; }
            .category-tag { display: inline-block; background-color: #e0e0e0; padding: 5px 10px; margin: 5px 5px 5px 0; border-radius: 3px; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Job Post Available</h1>
            </div>
            <div class="content">
              <p>Hi ${contractorName},</p>
              <p>A new job post has been posted ${formattedDistance.toLowerCase()} of your location!</p>
              <div class="job-details">
                <div class="job-header">
                  <h3 class="job-title">${jobTitle}</h3>
                  <div class="job-meta">
                    <strong>Job Number:</strong> ${jobNumber}<br>
                    <strong>Job Size:</strong> ${formattedJobSize}<br>
                    <strong>Structure Type:</strong> ${formattedType}<br>
                    <strong>Location:</strong> ${formattedDistance} (contact to view full address)
                  </div>
                </div>
                <h3>Job Description:</h3>
                <p>${jobDescription}</p>
                <div class="categories">
                  <strong>Categories:</strong>
                  ${categories.map((cat) => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
              </div>
              <p>Log in to your Kooberit account to view details and contact the homeowner.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(contractorEmail, subject, html);
  }

  /**
   * Send notification to homeowner about contractor contact
   */
  async sendContractorContactNotification(
    homeownerEmail: string,
    homeownerName: string,
    contractorName: string,
    jobTitle: string,
    jobNumber: string,
    jobDescription: string
  ): Promise<void> {
    const subject = 'New Contractor Contacted You';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .job-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #0a7ea4; }
            .job-title { font-size: 18px; font-weight: bold; color: #0a7ea4; margin: 0 0 10px 0; }
            .job-meta { color: #666; font-size: 14px; margin: 5px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contractor Contact</h1>
            </div>
            <div class="content">
              <p>Hi ${homeownerName},</p>
              <p><strong>${contractorName}</strong> has contacted you about your job post:</p>
              <div class="job-info">
                <div class="job-title">${jobTitle}</div>
                <div class="job-meta">
                  <strong>Job Number:</strong> ${jobNumber}
                </div>
                <p style="margin-top: 10px; color: #555;"><em>"${jobDescription.substring(0, 150)}${jobDescription.length > 150 ? '...' : ''}"</em></p>
              </div>
              <p>You can now chat with them through the Kooberit app.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(homeownerEmail, subject, html);
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const subject = 'Verify Your Email - Kooberit';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Thank you for signing up for Kooberit!</p>
              <p>Please click the button below to verify your email address:</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/verify-email?token=${verificationToken}" class="button">Verify Email</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p>${process.env.FRONTEND_URL || 'http://localhost:8081'}/verify-email?token=${verificationToken}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send OTP verification email for signup
   */
  async sendOTPVerificationEmail(email: string, otpCode: string, firstName?: string): Promise<void> {
    const subject = 'Verify Your Email - Kooberit';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              text-align: center; 
              letter-spacing: 8px; 
              color: #0a7ea4; 
              background-color: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
              border: 2px dashed #0a7ea4;
            }
            .warning { 
              background-color: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 12px; 
              margin: 15px 0; 
              border-radius: 4px; 
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi${firstName ? ` ${firstName}` : ''},</p>
              <p>Thank you for signing up for Kooberit!</p>
              <p>Please use the following verification code to complete your registration:</p>
              <div class="otp-code">${otpCode}</div>
              <div class="warning">
                <strong>Important:</strong> This code will expire in 10 minutes and can only be used once.
              </div>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send OTP for password reset
   */
  async sendPasswordResetOTP(email: string, otpCode: string, firstName?: string): Promise<void> {
    const subject = 'Password Reset Code - Kooberit';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              text-align: center; 
              letter-spacing: 8px; 
              color: #0a7ea4; 
              background-color: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
              border: 2px dashed #0a7ea4;
            }
            .warning { 
              background-color: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 12px; 
              margin: 15px 0; 
              border-radius: 4px; 
            }
            .security-notice {
              background-color: #f8d7da;
              border-left: 4px solid #dc3545;
              padding: 12px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi${firstName ? ` ${firstName}` : ''},</p>
              <p>We received a request to reset your password for your Kooberit account.</p>
              <p>Please use the following verification code to reset your password:</p>
              <div class="otp-code">${otpCode}</div>
              <div class="warning">
                <strong>Important:</strong> This code will expire in 10 minutes and can only be used once.
              </div>
              <div class="security-notice">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send external invitation email (email → signup)
   */
  async sendExternalInvitationEmail(
    inviteeEmail: string,
    inviteCode: string,
    inviterCompanyName: string,
    inviteType: 'homeowner' | 'contractor'
  ): Promise<void> {
    const subject = 'You\'ve been invited to Kooberit';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .invite-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #0a7ea4; }
            .invite-code { font-size: 24px; font-weight: bold; text-align: center; color: #0a7ea4; padding: 15px; background-color: #f0f0f0; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You've Been Invited to Kooberit</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviterCompanyName}</strong> has invited you to join Kooberit, the home renovation app.</p>
              <div class="invite-box">
                <p style="margin-top: 15px; font-size: 14px; color: #666;">
                  Your invite code: <strong>${inviteCode}</strong>
                </p>
              </div>
              <p>Once you sign up, you'll be automatically connected with ${inviterCompanyName} in a private chat.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(inviteeEmail, subject, html);
  }

  /**
   * Send internal invitation email (existing users, for a specific job)
   */
  async sendInternalInvitationEmail(
    inviteeEmail: string,
    inviteCode: string,
    inviterName: string,
    jobTitle: string,
    jobNumber: string,
    jobId: string
  ): Promise<void> {
    const subject = `Job Invitation: ${jobTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0a7ea4; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .job-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #0a7ea4; }
            .job-title { font-size: 20px; font-weight: bold; color: #0a7ea4; margin: 0 0 10px 0; }
            .job-meta { color: #666; font-size: 14px; margin: 5px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Invitation</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> has invited you to bid on a job:</p>
              <div class="job-box">
                <div class="job-title">${jobTitle}</div>
                <div class="job-meta">
                  <strong>Job Number:</strong> ${jobNumber}
                </div>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kooberit. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(inviteeEmail, subject, html);
  }
}

export default new EmailService();

