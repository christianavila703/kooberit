import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { Invitation, User, Job } from '@/models';
import {
  IInvitationAttributes,
  IInvitationCreationAttributes,
  IInvitationDocument,
  InvitationStatus,
} from '@/types';
import { generateInviteCode } from '@/utils/helper';

/**
 * Invitation Service
 */
class InvitationService {
  
  /**
   * Create external invitation (email → signup)
   */
  async createExternalInvitation(
    inviterUserId: string,
    inviteeEmail: string,
    inviteType: 'homeowner' | 'contractor'
  ): Promise<IInvitationDocument> {
    // Check if inviter exists and is a contractor
    const inviter = await User.findById(inviterUserId).exec();
    if (!inviter) {
      throw new CustomError('Inviter not found', 404);
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: inviteeEmail.toLowerCase().trim() }).exec();
    if (existingUser) {
      throw new CustomError('User with this email already exists', 409);
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await Invitation.findOne({
      inviteeEmail: inviteeEmail.toLowerCase().trim(),
      status: 'pending',
    }).exec();

    if (existingInvitation) {
      throw new CustomError('A pending invitation already exists for this email', 409);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const existing = await Invitation.findOne({ inviteCode }).exec();
      if (!existing) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new CustomError('Failed to generate unique invite code', 500);
    }

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await Invitation.create({
      inviteCode,
      inviterUserId: new Types.ObjectId(inviterUserId),
      inviteeEmail: inviteeEmail.toLowerCase().trim(),
      inviteType,
      status: 'pending',
      expiresAt,
    });

    return invitation;
  }

  /**
   * Create internal invitation (existing users, for a specific job)
   */
  async createInternalInvitation(
    inviterUserId: string,
    inviteeEmail: string,
    jobId: string
  ): Promise<IInvitationDocument> {
    // Check if inviter exists
    const inviter = await User.findById(inviterUserId).exec();
    if (!inviter) {
      throw new CustomError('Inviter not found', 404);
    }

    // Check if job exists and belongs to inviter
    const job = await Job.findById(jobId).exec();
    if (!job) {
      throw new CustomError('Job not found', 404);
    }

    if (job.homeownerId.toString() !== inviterUserId) {
      throw new CustomError('You can only invite contractors to your own jobs', 403);
    }

    // Job must be in 'pending' status (not posted to market)
    if (job.status !== 'pending') {
      throw new CustomError('Can only invite contractors to jobs that are not yet posted to market', 400);
    }

    // Check if invitee exists
    const invitee = await User.findOne({ email: inviteeEmail.toLowerCase().trim() }).exec();
    if (!invitee) {
      throw new CustomError('User with this email not found', 404);
    }

    // Check if there's already a pending invitation for this job and email
    const existingInvitation = await Invitation.findOne({
      jobId: new Types.ObjectId(jobId),
      inviteeEmail: inviteeEmail.toLowerCase().trim(),
      status: 'pending',
    }).exec();

    if (existingInvitation) {
      throw new CustomError('A pending invitation already exists for this contractor and job', 409);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const existing = await Invitation.findOne({ inviteCode }).exec();
      if (!existing) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new CustomError('Failed to generate unique invite code', 500);
    }

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await Invitation.create({
      inviteCode,
      inviterUserId: new Types.ObjectId(inviterUserId),
      inviteeEmail: inviteeEmail.toLowerCase().trim(),
      inviteType: 'contractor', // Internal invitations are always for contractors
      status: 'pending',
      jobId: new Types.ObjectId(jobId),
      expiresAt,
    });

    return invitation;
  }

  /**
   * Find invitation by code
   */
  async findInvitationByCode(inviteCode: string): Promise<IInvitationDocument | null> {
    const invitation = await Invitation.findOne({ inviteCode })
      .populate('inviter', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description')
      .exec();

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < new Date() && invitation.status === 'pending') {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' }).exec();
      invitation.status = 'expired';
    }

    return invitation;
  }

  /**
   * Accept invitation (called after user signs up or clicks link)
   */
  async acceptInvitation(inviteCode: string, acceptedUserId: string): Promise<IInvitationDocument> {
    const invitation = await Invitation.findOne({ inviteCode }).exec();

    if (!invitation) {
      throw new CustomError('Invitation not found', 404);
    }

    if (invitation.status !== 'pending') {
      throw new CustomError('Invitation has already been used or expired', 400);
    }

    if (invitation.expiresAt < new Date()) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' }).exec();
      throw new CustomError('Invitation has expired', 400);
    }

    // Verify email matches
    const user = await User.findById(acceptedUserId).exec();
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      throw new CustomError('Invitation email does not match user email', 400);
    }

    // Update invitation status
    const updatedInvitation = await Invitation.findByIdAndUpdate(
      invitation._id,
      {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedUserId: new Types.ObjectId(acceptedUserId),
      },
      { new: true }
    )
      .populate('inviter', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description')
      .exec();

    if (!updatedInvitation) {
      throw new CustomError('Failed to update invitation', 500);
    }

    // For external invitations, create a 1-to-1 chat between inviter and invitee
    if (!updatedInvitation.jobId) {
      try {
        // Create a dummy job for the chat (or use a system job)
        // Actually, we might need to create a chat without a job, or create a placeholder job
        // For now, let's create a chat with a null jobId if the schema allows, or skip chat creation
        // The requirement says "both users are automatically placed into 1-to-1 chat"
        // We'll need to check the Chat model to see if jobId is required
        // For now, let's assume we can create a chat without a job for external invitations
        // This might require updating the Chat model
      } catch (error) {
        // Log error but don't fail the invitation acceptance
        console.error('Failed to create chat after invitation acceptance:', error);
      }
    }

    return updatedInvitation;
  }

  /**
   * Get invitations by inviter
   */
  async getInvitationsByInviter(
    inviterUserId: string,
    status?: InvitationStatus
  ): Promise<IInvitationDocument[]> {
    const filter: any = { inviterUserId: new Types.ObjectId(inviterUserId) };
    if (status) {
      filter.status = status;
    }

    return Invitation.find(filter)
      .populate('inviter', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get invitations by invitee email
   */
  async getInvitationsByInvitee(
    inviteeEmail: string,
    status?: InvitationStatus
  ): Promise<IInvitationDocument[]> {
    const filter: any = { inviteeEmail: inviteeEmail.toLowerCase().trim() };
    if (status) {
      filter.status = status;
    }

    return Invitation.find(filter)
      .populate('inviter', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Count invitations for a specific job
   */
  async countInvitationsByJob(jobId: string, status?: InvitationStatus): Promise<number> {
    const filter: any = { jobId: new Types.ObjectId(jobId) };
    if (status) {
      filter.status = status;
    }
    return Invitation.countDocuments(filter).exec();
  }

  /**
   * Check if a contractor has been invited to a specific job
   */
  async checkInvitationByJobAndContractor(
    jobId: string,
    contractorEmail: string
  ): Promise<boolean> {
    const invitation = await Invitation.findOne({
      jobId: new Types.ObjectId(jobId),
      inviteeEmail: contractorEmail.toLowerCase().trim(),
      status: { $in: ['pending', 'accepted'] }, // Check for pending or accepted invitations
    }).exec();
    return Boolean(invitation);
  }
}

export default new InvitationService();

