import { Request, Response } from 'express';
import invitationService from '@/services/invitationService';
import emailService from '@/services/emailService';
import userService from '@/services/userService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import jobService from '@/services/jobService';

/**
 * Create external invitation (email → signup)
 */
export const createExternalInvitation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { inviteeEmail, inviteType } = req.body;

    if (!inviteeEmail || !inviteType) {
      return res.status(400).json({
        success: false,
        message: 'inviteeEmail and inviteType are required',
      });
    }

    if (!['homeowner', 'contractor'].includes(inviteType)) {
      return res.status(400).json({
        success: false,
        message: 'inviteType must be either "homeowner" or "contractor"',
      });
    }

    const invitation = await invitationService.createExternalInvitation(
      user.id,
      inviteeEmail,
      inviteType
    );

    // Get inviter details for email
    const inviter = await userService.findUserById(user.id);
    if (!inviter) {
      throw new CustomError('Inviter not found', 404);
    }

    // Send invitation email
    try {
      await emailService.sendExternalInvitationEmail(
        inviteeEmail,
        invitation.inviteCode,
        inviter.companyName || `${inviter.firstName} ${inviter.lastName}`,
        inviteType
      );
    } catch (emailError) {
      logger.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      message: 'Invitation created and sent successfully',
      data: invitation,
    });
  } catch (error: any) {
    logger.error('Create external invitation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create internal invitation (existing users, for a specific job)
 */
export const createInternalInvitation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { inviteeEmail, jobId } = req.body;

    if (!inviteeEmail || !jobId) {
      return res.status(400).json({
        success: false,
        message: 'inviteeEmail and jobId are required',
      });
    }

    const invitation = await invitationService.createInternalInvitation(
      user.id,
      inviteeEmail,
      jobId
    );

    // Get invitee user
    const invitee = await userService.findUserByEmail(inviteeEmail);
    if (!invitee) {
      throw new CustomError('Invitee user not found', 404);
    }

    // Get inviter and job details
    const inviter = await userService.findUserById(user.id);
    if (!inviter) {
      throw new CustomError('Inviter not found', 404);
    }

    const job = await jobService.findJobById(jobId) ;
    if (!job) {
      throw new CustomError('Job not found', 404);
    }

    // Send email notification
    try {
      await emailService.sendInternalInvitationEmail(
        inviteeEmail,
        invitation.inviteCode,
        `${inviter.firstName} ${inviter.lastName}`,
        job.jobTitle,
        job.jobNumber,
        jobId
      );
    } catch (emailError) {
      logger.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      message: 'Invitation created and sent successfully',
      data: invitation,
    });
  } catch (error: any) {
    logger.error('Create internal invitation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Validate invitation code (for signup flow)
 */
export const validateInvitationCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Invitation code is required',
      });
    }

    const invitation = await invitationService.findInvitationByCode(code);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Invitation has been ${invitation.status}`,
        data: { status: invitation.status },
      });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitation is valid',
      data: {
        inviteCode: invitation.inviteCode,
        inviteType: invitation.inviteType,
        inviteeEmail: invitation.inviteeEmail,
        inviter: invitation.inviterUserId,
        jobId: invitation.jobId?.toString(),
      },
    });
  } catch (error: any) {
    logger.error('Validate invitation code error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get invitations by inviter
 */
export const getInvitationsByInviter = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    const invitations = await invitationService.getInvitationsByInviter(
      user.id,
      status as any
    );

    return res.status(200).json({
      success: true,
      message: 'Invitations retrieved successfully',
      data: invitations,
    });
  } catch (error: any) {
    logger.error('Get invitations by inviter error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get invitation count for a job
 */
export const getInvitationCountByJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { status } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'jobId is required',
      });
    }

    const count = await invitationService.countInvitationsByJob(
      jobId,
      status as any
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation count retrieved successfully',
      data: { count },
    });
  } catch (error: any) {
    logger.error('Get invitation count by job error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Check if contractor has been invited to a job
 */
export const checkInvitationByJobAndContractor = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const user = (req as any).user;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'jobId is required',
      });
    }

    // Get user email
    const userData = await userService.findUserById(user.id);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const hasInvitation = await invitationService.checkInvitationByJobAndContractor(
      jobId,
      userData.email
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation check completed',
      data: { hasInvitation },
    });
  } catch (error: any) {
    logger.error('Check invitation by job and contractor error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

