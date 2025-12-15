import bcrypt from 'bcrypt';
import CustomError from '@/utils/customError';
import { generateToken } from '@/utils/jwt';
import {
  DEFAULT_USER_ALLOW_STATUS,
  DEFAULT_USER_ROLE,
  USER_ALLOW_STATUS,
} from '@enums';
import { ILoginRequest, IRegisterRequest, IAuthResponse } from '@/types';
import userService from '@/services/userService';
import otpService from '@/services/otpService';
import emailService from '@/services/emailService';

/**
 * Auth Service
 */

class AuthService {
  /**
   * Register a new user (creates user but requires OTP verification)
   */
  async register(registerData: IRegisterRequest): Promise<{ message: string; email: string }> {
    // Check if user already exists
    const existingUser = await userService.findUserByEmail(registerData.email);
    if (existingUser) {
      // If user exists but email is not verified, allow resending OTP
      if (!existingUser.emailVerified) {
        // Update user info if needed (in case they're trying to register again with different info)
        await userService.updateUser(existingUser.id!, {
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          companyName: registerData.companyName,
          status: USER_ALLOW_STATUS.PENDING_VERIFICATION,
        });

        // Generate and send new OTP
        const otpCode = await otpService.generateOTP(registerData.email, 'email_verification');
        await emailService.sendOTPVerificationEmail(registerData.email, otpCode, registerData.firstName);

        return {
          message: 'A verification code has been sent to your email. Please verify your email to complete registration.',
          email: registerData.email,
        };
      }
      // If email is already verified, user exists
      throw new CustomError('User with this email already exists', 409);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerData.password, saltRounds);

    // Create user (email not verified yet)
    const role = registerData.role || DEFAULT_USER_ROLE;
    const status = registerData.status || USER_ALLOW_STATUS.PENDING_VERIFICATION;

    const user = await userService.createUser({
      email: registerData.email,
      password: hashedPassword,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      companyName: registerData.companyName,
      role,
      status,
      emailVerified: false,
    });

    // Generate and send OTP
    const otpCode = await otpService.generateOTP(registerData.email, 'email_verification');
    await emailService.sendOTPVerificationEmail(registerData.email, otpCode, registerData.firstName);

    return {
      message: 'Registration successful. Please verify your email with the OTP code sent to your email.',
      email: registerData.email,
    };
  }

  /**
   * Verify email with OTP and complete registration
   */
  async verifyEmailOTP(email: string, otpCode: string): Promise<IAuthResponse> {
    // Verify OTP
    await otpService.verifyOTP(email, otpCode, 'email_verification');

    // Find user
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new CustomError('Email already verified', 400);
    }

    // Mark email as verified and update status to ALLOW
    await userService.updateUser(user.id!, { 
      emailVerified: true,
      status: USER_ALLOW_STATUS.ALLOW,
    });

    // Generate token
    const token = generateToken({
      id: user.id!,
      email: user.email,
    });

    // Clean up OTP
    await otpService.deleteOTPs(email, 'email_verification');

    return {
      user: {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        companyName: user.companyName,
        role: user.role,
        status: user.status,
        uniqueId: user.uniqueId,
      },
      token: token,
    };
  }

  /**
   * Resend OTP for email verification
   */
  async resendVerificationOTP(email: string): Promise<{ message: string }> {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account with that email exists, a verification code has been sent.' };
    }

    if (user.emailVerified) {
      throw new CustomError('Email already verified', 400);
    }

    // Generate and send new OTP
    const otpCode = await otpService.generateOTP(email, 'email_verification');
    await emailService.sendOTPVerificationEmail(email, otpCode, user.firstName);

    return { message: 'Verification code has been sent to your email.' };
  }

  /**
   * Login user
   */
  async login(loginData: ILoginRequest): Promise<IAuthResponse> {
    // Find user by email
    const user = await userService.findUserByEmail(loginData.email, true);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    if (user.status === USER_ALLOW_STATUS.BLOCK) {
      throw new CustomError('Your account has been blocked', 403);
    }
    
    // Verify password first (to avoid revealing user existence)
    if (!user.password) {
      throw new CustomError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Check if email is verified (only after password is verified)
    if (!user.emailVerified || user.status === USER_ALLOW_STATUS.PENDING_VERIFICATION) {
      // Resend OTP automatically
      const otpCode = await otpService.generateOTP(loginData.email, 'email_verification');
      await emailService.sendOTPVerificationEmail(loginData.email, otpCode, user.firstName);
      
      throw new CustomError('EMAIL_VERIFICATION_REQUIRED', 403);
    }

    // Update last login
    await userService.updateLastLogin(user.id!);

    // Generate token
    const token = generateToken({
      id: user.id!,
      email: user.email,
    });

    return {
      user: {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        companyName: user.companyName,
        role: user.role,
        status: user.status,
        uniqueId: user.uniqueId,
      },
      token: token,
    };
  }


  /**
   * Verify user exists and is allowed (for middleware use)
   */
  async verifyUserStatus(userId: string) {
    const user = await userService.findUserById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.status === USER_ALLOW_STATUS.BLOCK) {
      throw new CustomError('Your account has been blocked', 403);
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userService.findUserById(userId, true);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Verify old password
    if (!user.password) {
      throw new CustomError('User credentials are unavailable', 500);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Old password is incorrect', 401);
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userService.updateUser(userId, { password: hashedPassword });
  }

  /**
   * Request password reset (sends OTP)
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }

    // Generate and send OTP
    const otpCode = await otpService.generateOTP(email, 'password_reset');
    await emailService.sendPasswordResetOTP(email, otpCode, user.firstName);

    return { message: 'If an account with that email exists, a password reset code has been sent.' };
  }

  /**
   * Reset password with OTP
   */
  async resetPasswordWithOTP(email: string, otpCode: string, newPassword: string): Promise<void> {
    // Verify OTP
    await otpService.verifyOTP(email, otpCode, 'password_reset');

    // Find user
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userService.updateUser(user.id!, { password: hashedPassword });

    // Clean up OTP
    await otpService.deleteOTPs(email, 'password_reset');
  }
}

export default new AuthService();

