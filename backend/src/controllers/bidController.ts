import { Request, Response } from 'express';
import bidService from '@/services/bidService';
import logger from '@/utils/logger';
import { Job } from '@/models';
import { USER_ROLES } from '@enums';

/**
 * Create a new bid
 */
export const createBid = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { jobId, bidValue, projectDueDate, passFeeToHomeowner } = req.body;

    if (user.role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can submit bids',
      });
    }

    // Get job to find homeowner
    const job = await Job.findById(jobId).exec();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const bid = await bidService.createBid({
      jobId: jobId as any,
      contractorId: user.id as any,
      homeownerId: job.homeownerId as any,
      bidValue: parseFloat(bidValue),
      projectDueDate: new Date(projectDueDate),
      passFeeToHomeowner: passFeeToHomeowner || false,
    });

    logger.info(`Bid created: ${bid._id} by contractor: ${user.id}`);

    return res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: bid.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Create bid error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all bids for a job
 */
export const getBidsByJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Verify user has access to this job
    const job = await Job.findById(jobId).exec();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const bids = await bidService.findBidsByJob(jobId);
    const bidsData = bids.map((bid) => bid.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Bids retrieved successfully',
      data: bidsData,
    });
  } catch (error: any) {
    logger.error('Get bids by job error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all bids for a chat
 */
export const getBidsByChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    const bids = await bidService.findBidsByChat(chatId);
    const bidsData = bids.map((bid) => bid.toObject({ virtuals: true }));
    
    return res.status(200).json({
      success: true,
      message: 'Bids retrieved successfully',
      data: bidsData,
    });
  } catch (error: any) {
    logger.error('Get bids by chat error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get bid by ID
 */
export const getBidById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const bid = await bidService.findBidById(id);
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found',
      });
    }

    // Verify user has access
    if (
      bid.contractorId.toString() !== user.id &&
      bid.homeownerId.toString() !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this bid',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Bid retrieved successfully',
      data: bid.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Get bid error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get bids by contractor
 */
export const getBidsByContractor = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can view their bids',
      });
    }

    const bids = await bidService.findBidsByContractor(user.id);
    const bidsData = bids.map((bid) => bid.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Bids retrieved successfully',
      data: bidsData,
    });
  } catch (error: any) {
    logger.error('Get bids by contractor error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get bids by homeowner
 */
export const getBidsByHomeowner = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const bids = await bidService.findBidsByHomeowner(user.id);
    const bidsData = bids.map((bid) => bid.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Bids retrieved successfully',
      data: bidsData,
    });
  } catch (error: any) {
    logger.error('Get bids by homeowner error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Award a bid
 */
export const awardBid = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const bid = await bidService.awardBid(id, user.id);

    return res.status(200).json({
      success: true,
      message: 'Bid awarded successfully',
      data: bid.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Award bid error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reject a bid
 */
export const rejectBid = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const bid = await bidService.rejectBid(id, user.id);

    return res.status(200).json({
      success: true,
      message: 'Bid rejected successfully',
      data: bid.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Reject bid error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create extension/change request
 */
export const createExtensionRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { bidId, requestType, newDate, newBudget, explanation } = req.body;

    if (user.role !== USER_ROLES.CONTRACTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can create extension requests',
      });
    }

    // Get bid to find job and homeowner
    const bid = await bidService.findBidById(bidId);
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found',
      });
    }

    const request = await bidService.createExtensionRequest({
      bidId: bidId as any,
      jobId: bid.jobId as any,
      contractorId: user.id as any,
      homeownerId: bid.homeownerId as any,
      requestType,
      newDate: newDate ? new Date(newDate) : undefined,
      newBudget: newBudget ? parseFloat(newBudget) : undefined,
      explanation,
    });

    return res.status(201).json({
      success: true,
      message: 'Extension request created successfully',
      data: request.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Create extension request error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Respond to extension/change request
 */
export const respondToExtensionRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected',
      });
    }

    const request = await bidService.respondToExtensionRequest(id, user.id, status);

    return res.status(200).json({
      success: true,
      message: `Extension request ${status} successfully`,
      data: request.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Respond to extension request error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get extension requests by bid
 */
export const getExtensionRequestsByBid = async (req: Request, res: Response) => {
  try {
    const { bidId } = req.params;
    const user = (req as any).user;

    // Verify user has access to this bid
    const bid = await bidService.findBidById(bidId);
    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found',
      });
    }

    if (
      bid.contractorId.toString() !== user.id &&
      bid.homeownerId.toString() !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view extension requests for this bid',
      });
    }

    const requests = await bidService.findExtensionRequestsByBid(bidId);
    const requestsData = requests.map((req) => req.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Extension requests retrieved successfully',
      data: requestsData,
    });
  } catch (error: any) {
    logger.error('Get extension requests error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get pending extension requests
 */
export const getPendingExtensionRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let requests;
    if (user.role === USER_ROLES.CONTRACTOR) {
      requests = await bidService.findPendingExtensionRequestsForContractor(user.id);
    } else if (user.role === USER_ROLES.HOMEOWNER) {
      requests = await bidService.findPendingExtensionRequestsForHomeowner(user.id);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only contractors and homeowners can view extension requests',
      });
    }

    const requestsData = requests.map((req) => req.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Pending extension requests retrieved successfully',
      data: requestsData,
    });
  } catch (error: any) {
    logger.error('Get pending extension requests error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update completion status
 */
export const updateCompletionStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { bidId } = req.params;
    const { completedOnTime, completedWithinBudget } = req.body;

    if (typeof completedOnTime !== 'boolean' || typeof completedWithinBudget !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'completedOnTime and completedWithinBudget must be boolean values',
      });
    }

    const bid = await bidService.updateCompletionStatus(
      bidId,
      user.id,
      completedOnTime,
      completedWithinBudget
    );

    return res.status(200).json({
      success: true,
      message: 'Completion status updated successfully',
      data: bid.toObject({ virtuals: true }),
    });
  } catch (error: any) {
    logger.error('Update completion status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

