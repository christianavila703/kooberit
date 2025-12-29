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
import invitationService from '@/services/invitationService';
import chatService from '@/services/chatService';
import jobService from '@/services/jobService';
import { Contact, User } from '@/models';
import logger from '@/utils/logger';
import { Types } from 'mongoose';

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

    // Handle invite code if provided
    if (registerData.inviteCode && registerData.inviteCode.trim()) {
      const invitation = await invitationService.findInvitationByCode(registerData.inviteCode.trim().toUpperCase());
      if (invitation) {
        // Verify email matches invitation
        if (invitation.inviteeEmail.toLowerCase() !== registerData.email.toLowerCase()) {
          throw new CustomError('Invitation email does not match registration email', 400);
        }
        // Use invite type as role if not specified
        if (!registerData.role) {
          registerData.role = invitation.inviteType === 'contractor' ? 'contractor' : 'homeowner';
        }
      } else {
        // Invite code provided but not found - this is okay, just log it
        // Don't fail registration if invite code is invalid
        logger.warn(`Invite code ${registerData.inviteCode} not found during registration`);
      }
    }

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
  async verifyEmailOTP(email: string, otpCode: string, inviteCode?: string): Promise<IAuthResponse> {
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

    // Handle invitation if invite code is provided
    if (inviteCode) {
      try {
        const invitation = await invitationService.acceptInvitation(inviteCode, user.id!);
        
        // Get inviter user to determine roles
        const inviter = await userService.findUserById(invitation.inviterUserId.toString());
        if (!inviter) {
          logger.warn(`Inviter not found for invitation ${invitation.inviteCode}`);
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
            token: generateToken({
              id: user.id!,
              email: user.email,
            }),
          };
        }

        // Determine homeowner and contractor based on invitation type and roles
        let homeownerId: string;
        let contractorId: string;
        let jobId: Types.ObjectId;

        if (!invitation.jobId) {
          // External invitation: determine roles based on invitation type
          // If contractor invites homeowner: inviter is contractor, invitee is homeowner
          // If homeowner invites contractor: inviter is homeowner, invitee is contractor
          if (invitation.inviteType === 'homeowner') {
            // Contractor is inviting a homeowner
            contractorId = invitation.inviterUserId.toString();
            homeownerId = user.id!;
          } else {
            // Homeowner is inviting a contractor
            homeownerId = invitation.inviterUserId.toString();
            contractorId = user.id!;
          }

          // Create a system job for external invitation chats
          // This job should only be visible to the inviter contractor (if contractor invited)
          const systemJob = await jobService.createJob({
            homeownerId: new Types.ObjectId(homeownerId),
            jobTitle: 'Direct Message',
            jobSize: 'micro',
            structureType: 'single_detached_house', // Default value
            description: 'Direct message chat',
            categories: [],
            contractorLimit: 1,
            location: {
              address: 'N/A',
              coordinates: {
                latitude: 0,
                longitude: 0, // Default coordinates
              },
              cityName: 'N/A',
              province: 'N/A',
            },
            status: 'open',
            // Mark this job as created by contractor invitation only if contractor is the inviter
            invitedByContractorId: invitation.inviteType === 'homeowner' ? invitation.inviterUserId : undefined,
          } as any);
          
          jobId = systemJob._id;
        } else {
          // Internal invitation (with jobId) - inviter is homeowner, invitee is contractor
          homeownerId = invitation.inviterUserId.toString();
          contractorId = user.id!;
          jobId = invitation.jobId;
        }

        // Create chat between homeowner and contractor
        const chat = await chatService.createOrGetChat({
          jobId: jobId,
          homeownerId: new Types.ObjectId(homeownerId),
          contractorId: new Types.ObjectId(contractorId),
        });

        // Create contact (contract) between homeowner and contractor
        try {
          const existingContact = await Contact.findOne({
            jobId: new Types.ObjectId(jobId),
            contractorId: new Types.ObjectId(contractorId),
          }).exec();

          if (!existingContact) {
            // Check if job has reached contractor limit
            const job = await jobService.findJobById(jobId.toString());
            if (job && job.contractorContactsCount < job.contractorLimit) {
              // Create contact with existing chat
              await Contact.create({
                jobId: new Types.ObjectId(jobId),
                contractorId: new Types.ObjectId(contractorId),
                homeownerId: new Types.ObjectId(homeownerId),
                paymentAmount: 0,
                paymentStatus: 'completed', // For invitations, payment is considered completed
                chatRoomId: chat._id,
                contactInfoRevealed: true,
              });

              // Increment contractor contacts count
              await jobService.incrementContractorContactsCount(jobId.toString());

            } else if (job) {
              logger.warn(`Job ${jobId} has reached contractor limit, skipping contact creation`);
            }
          } else {
            logger.info(`Contact already exists for job ${jobId} between homeowner ${homeownerId} and contractor ${contractorId}`);
          }
        } catch (contactError: any) {
          logger.error('Failed to create contact after invitation acceptance:', contactError);
          // Don't fail registration if contact creation fails
        }
      } catch (invitationError: any) {
        // Log error but don't fail registration if invitation handling fails
        logger.error('Failed to handle invitation:', invitationError);
      }
    }

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

