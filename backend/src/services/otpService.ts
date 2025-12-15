import crypto from 'crypto';
import OTP, { OTPType } from '@/models/OTP';
import CustomError from '@/utils/customError';
import logger from '@/utils/logger';

/**
 * OTP Service
 * Handles generation, verification, and management of OTP codes
 */

class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
  private readonly MAX_ATTEMPTS = 5; // Maximum verification attempts

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOTPCode(): string {
    // Generate a random 6-digit number
    const code = crypto.randomInt(100000, 999999).toString();
    return code;
  }

  /**
   * Calculate expiration time
   */
  private getExpirationTime(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiresAt;
  }

  /**
   * Invalidate all existing OTPs for an email and type
   */
  private async invalidateExistingOTPs(email: string, type: OTPType): Promise<void> {
    await OTP.updateMany(
      { email: email.toLowerCase(), type, verified: false },
      { verified: true } // Mark as verified to invalidate them
    );
  }

  /**
   * Generate and store a new OTP
   */
  async generateOTP(email: string, type: OTPType): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    // Invalidate existing OTPs for this email and type
    await this.invalidateExistingOTPs(normalizedEmail, type);

    // Generate new OTP code
    const code = this.generateOTPCode();
    const expiresAt = this.getExpirationTime();

    // Store OTP in database
    await OTP.create({
      email: normalizedEmail,
      code,
      type,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    logger.info(`OTP generated for ${normalizedEmail}, type: ${type}`);

    return code;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, code: string, type: OTPType): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Find the most recent unverified OTP for this email and type
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      type,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new CustomError('No OTP found. Please request a new code.', 404);
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      throw new CustomError('OTP has expired. Please request a new code.', 400);
    }

    // Check if maximum attempts exceeded
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      throw new CustomError(
        'Maximum verification attempts exceeded. Please request a new code.',
        400
      );
    }

    // Increment attempts
    otpRecord.attempts += 1;
    await otpRecord.save();

    // Verify code
    if (otpRecord.code !== normalizedCode) {
      const remainingAttempts = this.MAX_ATTEMPTS - otpRecord.attempts;
      throw new CustomError(
        `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new code.'}`,
        400
      );
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    logger.info(`OTP verified successfully for ${normalizedEmail}, type: ${type}`);

    return true;
  }

  /**
   * Check if a valid OTP exists for email and type (without verifying)
   */
  async hasValidOTP(email: string, type: OTPType): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      type,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return false;
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      return false;
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      return false;
    }

    return true;
  }

  /**
   * Delete all OTPs for an email (cleanup)
   */
  async deleteOTPs(email: string, type?: OTPType): Promise<void> {
    const query: any = { email: email.toLowerCase().trim() };
    if (type) {
      query.type = type;
    }
    await OTP.deleteMany(query);
  }
}

export default new OTPService();

