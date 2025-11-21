import { Request, Response } from 'express';
import contractorContactService from '@/services/contractorContactService';
import emailService from '@/services/emailService';
import logger from '@/utils/logger';

/**
 * Get contractor contacts for a job post
 */
export const getContractorContactsByJobPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobPostId } = req.params;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can view contractor contacts',
      });
    }

    const contacts = await contractorContactService.findContractorContactsByJobPost(jobPostId);

    return res.status(200).json({
      success: true,
      message: 'Contractor contacts retrieved successfully',
      data: contacts,
    });
  } catch (error: any) {
    logger.error('Get contractor contacts error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all contractor contacts for homeowner
 */
export const getHomeownerContractorContacts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can view their contractor contacts',
      });
    }

    const contacts = await contractorContactService.findContractorContactsByHomeowner(user.id);

    return res.status(200).json({
      success: true,
      message: 'Contractor contacts retrieved successfully',
      data: contacts,
    });
  } catch (error: any) {
    logger.error('Get homeowner contractor contacts error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Check if contractor has contacted a job post
 */
export const checkContractorContact = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobPostId } = req.params;

    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can check contact status',
      });
    }

    const contact = await contractorContactService.findContractorContactByJobPostAndContractor(
      jobPostId,
      user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Contact status retrieved successfully',
      data: {
        hasContacted: !!contact,
        contact: contact || null,
      },
    });
  } catch (error: any) {
    logger.error('Check contractor contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create contractor contact (when contractor pays to contact)
 */
export const createContractorContact = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobPostId, paymentTransactionId } = req.body;

    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can create contacts',
      });
    }

    // Get job post to find homeowner
    const { JobPost } = await import('@/models');
    const jobPost = await JobPost.findById(jobPostId)
      .populate('homeownerId')
      .exec();

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    const contactData = {
      jobPostId,
      contractorId: user.id,
      homeownerId: (jobPost.homeownerId as any)._id.toString(),
      paymentAmount: 19.99,
      paymentTransactionId,
      paymentStatus: 'completed' as const,
    };

    const contact = await contractorContactService.createContractorContact(contactData);

    // Send email notification to homeowner
    try {
      const homeowner = jobPost.homeownerId as any;
      await emailService.sendContractorContactNotification(
        homeowner.email,
        `${homeowner.firstName} ${homeowner.lastName}`,
        `${user.firstName} ${user.lastName}`,
        jobPost.description
      );
    } catch (emailError) {
      logger.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    logger.info(`Contractor contact created: ${contact._id} by contractor: ${user.id}`);

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error: any) {
    logger.error('Create contractor contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

