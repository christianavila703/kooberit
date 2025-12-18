import { Request, Response } from 'express';
import { Types } from 'mongoose';
import contactService from '@/services/contactService';
import emailService from '@/services/emailService';
import logger from '@/utils/logger';
import { IContactDocument } from '@/types';

/**
 * Get contractor contacts for a job
 */
export const getContactsByJob = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobId } = req.params;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can view contractor contacts',
      });
    }

    const contacts = await contactService.findContactsByJob(jobId);

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    const contactsData = contacts.map((contact: IContactDocument) => contact.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Contractor contacts retrieved successfully',
      data: contactsData,
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

    const contacts = await contactService.findContactsByHomeowner(user.id);

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    const contactsData = contacts.map((contact: IContactDocument) => contact.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Contractor contacts retrieved successfully',
      data: contactsData,
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
 * Check if contractor has contacted a job
 */
export const checkContractorContact = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobId } = req.params;

    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can check contact status',
      });
    }

    const contact = await contactService.findContactByJobAndContractor(
      jobId,
      user.id
    );

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    // Note: chatRoomId is a field (ObjectId), chatRoom is a virtual (populated object)
    const transformedContact = contact ? contact.toObject({ virtuals: true }) : null;

    return res.status(200).json({
      success: true,
      message: 'Contact status retrieved successfully',
      data: {
        hasContacted: !!contact,
        contact: transformedContact,
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
export const createContact = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobId, paymentTransactionId } = req.body;

    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can create contacts',
      });
    }

    // Get job to find homeowner
    const { Job } = await import('@/models');
    const job = await Job.findById(jobId)
      .populate('homeowner', 'firstName lastName email')
      .exec();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    let contactData = {
      jobId: jobId as any,
      contractorId: user.id as any,
      homeownerId: job.homeownerId as any,
      paymentAmount: 19.99,
      paymentTransactionId,
      paymentStatus: 'completed' as const,
    };

    const contact = await contactService.createContact(contactData);

    // Send email notification to homeowner
    try {
      const homeowner = (job as any).homeowner || { email: '', firstName: '', lastName: '' };
      await emailService.sendContractorContactNotification(
        homeowner.email,
        `${homeowner.firstName} ${homeowner.lastName}`,
        `${user.firstName} ${user.lastName}`,
        job.jobTitle,
        job.jobNumber,
        job.description
      );
    } catch (emailError) {
      logger.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    logger.info(`Contractor contact created: ${contact._id} by contractor: ${user.id}`);

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    contactData = contact.toObject({ virtuals: true });

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contactData,
    });
  } catch (error: any) {
    logger.error('Create contractor contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

