import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { Bid, Job, Contact, Chat, User } from '@/models';
import {
  IBidCreationAttributes,
  IBidDocument,
  IExtensionRequestCreationAttributes,
  IExtensionRequestDocument,
} from '@/types';
import chatService from './chatService';
import emailService from './emailService';
import logger from '@/utils/logger';
import { ExtensionRequest } from '@/models';
import socketService from '@/socket/socket';

/**
 * Bid Service
 */
class BidService {
  /**
   * Create a new bid
   */
  async createBid(bidData: IBidCreationAttributes): Promise<IBidDocument> {
    // Check if bid already exists for this job and contractor
    const existingBid = await Bid.findOne({
      jobId: new Types.ObjectId(bidData.jobId),
      contractorId: new Types.ObjectId(bidData.contractorId),
    }).exec();

    if (existingBid) {
      throw new CustomError('You have already submitted a bid for this job', 409);
    }

    // Verify job exists and contractor has contacted
    const job = await Job.findById(bidData.jobId).exec();
    if (!job) {
      throw new CustomError('Job not found', 404);
    }

    // Prevent bidding on awarded or completed jobs
    if (job.status === 'awarded' || job.status === 'completed') {
      throw new CustomError('This job has already been awarded and is no longer accepting bids', 400);
    }

    // Check if contractor has contacted the homeowner
    const contact = await Contact.findOne({
      jobId: new Types.ObjectId(bidData.jobId),
      contractorId: new Types.ObjectId(bidData.contractorId),
      paymentStatus: 'completed',
    }).exec();

    if (!contact) {
      throw new CustomError('You must contact the homeowner before submitting a bid', 400);
    }

    // Calculate award fee (2.5% of bid value)
    // If passFeeToHomeowner is true, the bid value already includes the fee
    // If false, the fee is separate and contractor pays
    let bidValue = bidData.bidValue;
    let awardFee = bidValue * 0.025;
    
    if (bidData.passFeeToHomeowner) {
      // If fee is passed to homeowner, the bid value includes the fee
      // So we need to extract the base value and calculate fee from that
      // bidValue = baseValue + (baseValue * 0.025)
      // bidValue = baseValue * 1.025
      // baseValue = bidValue / 1.025
      const baseValue = bidValue / 1.025;
      awardFee = baseValue * 0.025;
      bidValue = baseValue; // Store the base value without fee
    }

    // Create bid
    const bid = await Bid.create({
      ...bidData,
      jobId: new Types.ObjectId(bidData.jobId),
      contractorId: new Types.ObjectId(bidData.contractorId),
      homeownerId: new Types.ObjectId(bidData.homeownerId),
      bidValue,
      awardFee,
      awardFeeStatus: bidData.passFeeToHomeowner ? 'pending' : 'pending', // Homeowner pays if passed
      bidStatus: 'pending',
    });

    logger.info(`Bid created: ${bid._id} by contractor: ${bidData.contractorId} for job: ${bidData.jobId}`);

    // Create system messages for bid submission
    const chat = await chatService.findChatByJobAndUsers(
      bidData.jobId.toString(),
      bidData.homeownerId.toString(),
      bidData.contractorId.toString()
    );

    if (chat) {
      await chatService.createBidSubmittedMessage(
        chat._id.toString(),
        bidData.contractorId.toString(),
        bidData.homeownerId.toString()
      );
    }

    return bid;
  }

  /**
   * Find bid by ID
   */
  async findBidById(id: string): Promise<IBidDocument | null> {
    if (!id) {
      return null;
    }
    return Bid.findById(id)
      .populate('contractor', 'firstName lastName email companyName')
      .populate('homeowner', 'firstName lastName email')
      .populate('job', 'jobTitle jobNumber description')
      .exec();
  }

  /**
   * Find all bids for a job
   */
  async findBidsByJob(jobId: string): Promise<IBidDocument[]> {
    return Bid.find({ jobId: new Types.ObjectId(jobId) })
      .populate('contractor', 'firstName lastName email companyName')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all bids for a chat
   */
  async findBidsByChat(chatId: string): Promise<IBidDocument[]> {
    // First, get the chat to find the jobId
    const chat = await Chat.findById(chatId).exec();
    if (!chat) {
      throw new CustomError('Chat not found', 404);
    }

    // Find bids for the job associated with this chat
    return Bid.find({ jobId: chat.jobId })
      .populate('contractor', 'firstName lastName email companyName')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all bids by contractor
   */
  async findBidsByContractor(contractorId: string): Promise<IBidDocument[]> {
    return Bid.find({ contractorId: new Types.ObjectId(contractorId) })
      .populate('job', 'jobTitle jobNumber description status')
      .populate('homeowner', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all bids by homeowner
   */
  async findBidsByHomeowner(homeownerId: string): Promise<IBidDocument[]> {
    return Bid.find({ homeownerId: new Types.ObjectId(homeownerId) })
      .populate('contractor', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description status')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find bid by job and contractor
   */
  async findBidByJobAndContractor(
    jobId: string,
    contractorId: string
  ): Promise<IBidDocument | null> {
    return Bid.findOne({
      jobId: new Types.ObjectId(jobId),
      contractorId: new Types.ObjectId(contractorId),
    })
      .populate('contractor', 'firstName lastName email companyName')
      .populate('job', 'jobTitle jobNumber description')
      .exec();
  }

  /**
   * Award a bid
   */
  async awardBid(bidId: string, homeownerId: string): Promise<IBidDocument> {
    const bid = await Bid.findById(bidId).exec();
    if (!bid) {
      throw new CustomError('Bid not found', 404);
    }

    if (bid.homeownerId.toString() !== homeownerId) {
      throw new CustomError('You are not authorized to award this bid', 403);
    }

    if (bid.bidStatus !== 'pending') {
      throw new CustomError('Bid has already been processed', 400);
    }

    // If fee is passed to homeowner, they can award but must pay before project starts
    // If fee is not passed, contractor must pay after award
    // So we allow awarding in both cases, but payment is required before messaging

    // Update bid status to awarded
    bid.bidStatus = 'awarded';
    bid.awardedAt = new Date();
    await bid.save();

    // Update job status to 'awarded' to prevent further bidding
    await Job.findByIdAndUpdate(bid.jobId, {
      status: 'awarded',
    }).exec();

    // Populate bid with contractor and job details for notifications
    await bid.populate('contractor', 'firstName lastName email');
    await bid.populate('job', 'jobTitle jobNumber');

    // Send notification message to chat about award fee payment requirement
    const chat = await chatService.findChatByJobAndUsers(
      bid.jobId.toString(),
      homeownerId,
      bid.contractorId.toString()
    );

    if (chat) {
      // Create system messages for bid award
      await chatService.createBidAwardedMessage(
        chat._id.toString(),
        bid.contractorId.toString(),
        homeownerId
      );
    }

    // Send notifications to awarded contractor
    const contractor = (bid as any).contractor;
    const job = (bid as any).job;
    
    if (contractor && contractor.email) {
      try {
        // Send email notification
        await emailService.sendBidAwardNotification(
          contractor.email,
          contractor.firstName || 'Contractor',
          job?.jobNumber || 'N/A',
          job?.jobTitle || 'Project',
          bid.bidValue,
          bid.projectDueDate,
          bid.passFeeToHomeowner || false,
          bid.awardFee
        );
        logger.info(`Email notification sent to awarded contractor ${contractor._id?.toString() || contractor.id?.toString() || 'unknown'}`);
      } catch (error: any) {
        logger.error(`Failed to send email notification to awarded contractor ${contractor._id?.toString() || contractor.id?.toString() || 'unknown'}:`, error);
      }

      try {
        // Send socket notification
        socketService.emitToUser(bid.contractorId.toString(), 'bid_awarded', {
          bidId: bid._id.toString(),
          jobId: bid.jobId.toString(),
          jobNumber: job?.jobNumber || 'N/A',
          jobTitle: job?.jobTitle || 'Project',
          bidValue: bid.bidValue,
          projectDueDate: bid.projectDueDate,
          awardFee: bid.awardFee,
          passFeeToHomeowner: bid.passFeeToHomeowner || false,
        });
        logger.info(`Socket notification sent to awarded contractor ${bid.contractorId}`);
      } catch (error: any) {
        logger.error(`Failed to send socket notification to awarded contractor ${bid.contractorId}:`, error);
      }
    }

    // Find bids that will be rejected (only pending ones, excluding already rejected)
    const bidsToReject = await Bid.find({
      jobId: bid.jobId,
      _id: { $ne: bid._id },
      bidStatus: 'pending',
    })
      .populate('contractor', 'firstName lastName email')
      .populate('job', 'jobNumber')
      .exec();

    // Reject all other pending bids for this job
    if (bidsToReject.length > 0) {
      await Bid.updateMany(
        {
          jobId: bid.jobId,
          _id: { $ne: bid._id },
          bidStatus: 'pending',
        },
        {
          bidStatus: 'rejected',
        }
      ).exec();
    }

    // Send notification only to bids that were just rejected (not already rejected ones)
    const unsuccessfulBids = bidsToReject;

    for (const unsuccessfulBid of unsuccessfulBids) {
      try {
        const contractor = (unsuccessfulBid as any).contractor;
        const job = (unsuccessfulBid as any).job;
        if (contractor && contractor.email && job) {
          await emailService.sendBidRejectionNotification(
            contractor.email,
            contractor.firstName || 'Contractor',
            job.jobNumber || 'N/A'
          );
        }

        // Send message in chat
        const chat = await chatService.findChatByJobAndUsers(
          bid.jobId.toString(),
          homeownerId,
          unsuccessfulBid.contractorId.toString()
        );

        if (chat) {
          // Create system messages for bid rejection
          await chatService.createBidRejectedMessage(
            chat._id.toString(),
            unsuccessfulBid.contractorId.toString(),
            homeownerId
          );
        }
      } catch (error) {
        logger.error(`Failed to notify unsuccessful bidder ${unsuccessfulBid.contractorId}:`, error);
      }
    }

    logger.info(`Bid awarded: ${bidId} by homeowner: ${homeownerId}`);

    return bid;
  }

  /**
   * Reject a bid
   */
  async rejectBid(bidId: string, homeownerId: string): Promise<IBidDocument> {
    const bid = await Bid.findById(bidId).exec();
    if (!bid) {
      throw new CustomError('Bid not found', 404);
    }

    if (bid.homeownerId.toString() !== homeownerId) {
      throw new CustomError('You are not authorized to reject this bid', 403);
    }

    if (bid.bidStatus !== 'pending') {
      throw new CustomError('Bid has already been processed', 400);
    }

    // Update bid status to rejected
    bid.bidStatus = 'rejected';
    await bid.save();

    // Populate bid with contractor and job details for notifications
    await bid.populate('contractor', 'firstName lastName email');
    await bid.populate('job', 'jobTitle jobNumber');

    // Send email notification to contractor
    try {
      const contractor = (bid as any).contractor;
      const job = (bid as any).job;
      if (contractor && contractor.email && job) {
        await emailService.sendBidRejectionNotification(
          contractor.email,
          contractor.firstName || 'Contractor',
          job.jobNumber || 'N/A'
        );
      }
    } catch (error) {
      logger.error(`Failed to send rejection email to contractor ${bid.contractorId}:`, error);
    }

    // Send message in chat
    try {
      const chat = await chatService.findChatByJobAndUsers(
        bid.jobId.toString(),
        homeownerId,
        bid.contractorId.toString()
      );

      if (chat) {
        // Create system messages for bid rejection
        await chatService.createBidRejectedMessage(
          chat._id.toString(),
          bid.contractorId.toString(),
          homeownerId
        );
      }
    } catch (error) {
      logger.error(`Failed to send rejection message to contractor ${bid.contractorId}:`, error);
    }

    logger.info(`Bid rejected: ${bidId} by homeowner: ${homeownerId}`);

    return bid;
  }

  /**
   * Update award fee payment status
   */
  async updateAwardFeeStatus(
    bidId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded',
    paymentData?: {
      paymentIntentId?: string;
      paymentMethodId?: string;
      transactionId?: string;
    }
  ): Promise<IBidDocument | null> {
    const updateData: any = { awardFeeStatus: status };
    if (paymentData?.paymentIntentId) {
      updateData.awardFeePaymentIntentId = paymentData.paymentIntentId;
    }
    if (paymentData?.paymentMethodId) {
      updateData.awardFeePaymentMethodId = paymentData.paymentMethodId;
    }
    if (paymentData?.transactionId) {
      updateData.awardFeeTransactionId = paymentData.transactionId;
    }

    return Bid.findByIdAndUpdate(bidId, updateData, { new: true }).exec();
  }

  /**
   * Create extension/change request
   */
  async createExtensionRequest(
    requestData: IExtensionRequestCreationAttributes
  ): Promise<IExtensionRequestDocument> {
    // Verify bid exists and belongs to contractor
    const bid = await Bid.findById(requestData.bidId).exec();
    if (!bid) {
      throw new CustomError('Bid not found', 404);
    }

    if (bid.contractorId.toString() !== requestData.contractorId.toString()) {
      throw new CustomError('You are not authorized to create this request', 403);
    }

    if (bid.bidStatus !== 'awarded') {
      throw new CustomError('Bid must be awarded before requesting changes', 400);
    }

    if (bid.awardFeeStatus !== 'completed') {
      throw new CustomError('Award fee must be paid before requesting changes', 400);
    }

    // Only allow once the due date is reached (per requirements)
    const dueDay = new Date(bid.projectDueDate);
    dueDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today.getTime() < dueDay.getTime()) {
      throw new CustomError('Change requests are only available once the project due date is reached', 400);
    }

    // Check if there's already a pending request of the same type
    const existingRequest = await ExtensionRequest.findOne({
      bidId: new Types.ObjectId(requestData.bidId),
      requestType: requestData.requestType,
      status: 'pending',
    }).exec();

    if (existingRequest) {
      throw new CustomError('You already have a pending request of this type', 409);
    }

    const request = await ExtensionRequest.create({
      ...requestData,
      bidId: new Types.ObjectId(requestData.bidId),
      jobId: new Types.ObjectId(requestData.jobId),
      contractorId: new Types.ObjectId(requestData.contractorId),
      homeownerId: new Types.ObjectId(requestData.homeownerId),
      status: 'pending',
    });

    logger.info(`Extension request created: ${request._id} by contractor: ${requestData.contractorId}`);

    // Notify homeowner in chat so the request is visible/processed from the conversation as well
    try {
      const chat = await chatService.findChatByJobAndUsers(
        requestData.jobId.toString(),
        requestData.homeownerId.toString(),
        requestData.contractorId.toString()
      );
      if (chat) {
        const summary =
          requestData.requestType === 'date_extension'
            ? `Change Request: Due Date Extension requested.\nNew due date: ${requestData.newDate ? new Date(requestData.newDate as any).toLocaleDateString() : '-'}\nExplanation: ${requestData.explanation}`
            : `Change Request: Bid Value Change requested.\nNew bid value: ${typeof requestData.newBudget === 'number' ? `$${requestData.newBudget.toFixed(2)}` : '-'}\nExplanation: ${requestData.explanation}`;

        await chatService.createMessage({
          chatId: chat._id as any,
          senderId: requestData.contractorId as any,
          content: summary,
          type: 'system',
          visibleTo: 'homeowner',
        });
      }
    } catch (error) {
      logger.error(`Failed to send extension request chat message for request ${request._id}:`, error);
    }

    return request;
  }

  /**
   * Respond to extension/change request
   */
  async respondToExtensionRequest(
    requestId: string,
    homeownerId: string,
    status: 'approved' | 'rejected'
  ): Promise<IExtensionRequestDocument> {
    const request = await ExtensionRequest.findById(requestId).exec();
    if (!request) {
      throw new CustomError('Request not found', 404);
    }

    if (request.homeownerId.toString() !== homeownerId) {
      throw new CustomError('You are not authorized to respond to this request', 403);
    }

    if (request.status !== 'pending') {
      throw new CustomError('Request has already been processed', 400);
    }

    request.status = status;
    request.respondedAt = new Date();
    await request.save();

    // If approved, update the bid
    if (status === 'approved') {
      const bid = await Bid.findById(request.bidId).exec();
      if (bid) {
        if (request.requestType === 'date_extension' && request.newDate) {
          bid.projectDueDate = request.newDate;
        } else if (request.requestType === 'budget_change' && request.newBudget) {
          // Recalculate award fee for new budget
          const newAwardFee = request.newBudget * 0.025;
          bid.bidValue = request.newBudget;
          bid.awardFee = newAwardFee;
        }
        await bid.save();
      }
    }

    logger.info(`Extension request ${status}: ${requestId} by homeowner: ${homeownerId}`);

    // Notify contractor (and homeowner) in chat with the decision + applied change
    try {
      const chat = await chatService.findChatByJobAndUsers(
        request.jobId.toString(),
        request.homeownerId.toString(),
        request.contractorId.toString()
      );
      if (chat) {
        const decisionLine = status === 'approved' ? 'APPROVED' : 'REJECTED';
        const details =
          request.requestType === 'date_extension'
            ? `Request: Due Date Extension\nProposed: ${request.newDate ? new Date(request.newDate).toLocaleDateString() : '-'}`
            : `Request: Bid Value Change\nProposed: ${typeof request.newBudget === 'number' ? `$${request.newBudget.toFixed(2)}` : '-'}`;

        const msgToContractor = `Change Request ${decisionLine} by Homeowner.\n${details}\nExplanation: ${request.explanation}`;
        await chatService.createMessage({
          chatId: chat._id as any,
          senderId: request.homeownerId as any,
          content: msgToContractor,
          type: 'system',
          visibleTo: 'contractor',
        });

        const msgToHomeowner = `You ${decisionLine} the contractor's change request.\n${details}`;
        await chatService.createMessage({
          chatId: chat._id as any,
          senderId: request.homeownerId as any,
          content: msgToHomeowner,
          type: 'system',
          visibleTo: 'homeowner',
        });
      }
    } catch (error) {
      logger.error(`Failed to send extension request response chat message for request ${requestId}:`, error);
    }

    return request;
  }

  /**
   * Find extension requests by bid
   */
  async findExtensionRequestsByBid(bidId: string): Promise<IExtensionRequestDocument[]> {
    return ExtensionRequest.find({ bidId: new Types.ObjectId(bidId) })
      .populate('contractor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find pending extension requests for contractor
   */
  async findPendingExtensionRequestsForContractor(
    contractorId: string
  ): Promise<IExtensionRequestDocument[]> {
    return ExtensionRequest.find({
      contractorId: new Types.ObjectId(contractorId),
      status: 'pending',
    })
      .populate('bid', 'bidValue projectDueDate')
      .populate('job', 'jobTitle jobNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find pending extension requests for homeowner
   */
  async findPendingExtensionRequestsForHomeowner(
    homeownerId: string
  ): Promise<IExtensionRequestDocument[]> {
    return ExtensionRequest.find({
      homeownerId: new Types.ObjectId(homeownerId),
      status: 'pending',
    })
      .populate('contractor', 'firstName lastName email companyName')
      .populate('bid', 'bidValue projectDueDate')
      .populate('job', 'jobTitle jobNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update completion status
   */
  async updateCompletionStatus(
    bidId: string,
    homeownerId: string,
    completedOnTime: boolean,
    completedWithinBudget: boolean
  ): Promise<IBidDocument> {
    const bid = await Bid.findById(bidId).exec();
    if (!bid) {
      throw new CustomError('Bid not found', 404);
    }

    if (bid.homeownerId.toString() !== homeownerId) {
      throw new CustomError('You are not authorized to update this bid', 403);
    }

    if (bid.bidStatus !== 'awarded') {
      throw new CustomError('Bid must be awarded before updating completion status', 400);
    }

    if (bid.awardFeeStatus !== 'completed') {
      throw new CustomError('Award fee must be paid before updating completion status', 400);
    }

    // Only allow once one day has passed after due date (per requirements)
    const dueDay = new Date(bid.projectDueDate);
    dueDay.setHours(0, 0, 0, 0);
    const oneDayAfter = new Date(dueDay);
    oneDayAfter.setDate(oneDayAfter.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today.getTime() < oneDayAfter.getTime()) {
      throw new CustomError('Completion status can be updated one day after the project due date', 400);
    }

    bid.completedOnTime = completedOnTime;
    bid.completedWithinBudget = completedWithinBudget;
    bid.completionPrompted = true;

    // Calculate efficiency points
    if (completedOnTime) {
      bid.onTimeEfficiencyPoints = bid.bidValue / 2;
    } else {
      bid.onTimeEfficiencyPoints = 0;
    }

    if (completedWithinBudget) {
      bid.onBudgetEfficiencyPoints = bid.bidValue / 2;
    } else {
      bid.onBudgetEfficiencyPoints = 0;
    }

    await bid.save();

    // Update contractor's efficiency ratio
    await this.updateContractorEfficiencyRatio(bid.contractorId.toString());

    // Update job status to 'completed' when project is completed
    await Job.findByIdAndUpdate(bid.jobId, {
      status: 'completed',
    }).exec();

    logger.info(`Completion status updated for bid: ${bidId}, job status updated to completed`);

    // Notify contractor in chat with allocated points
    try {
      const awardedBid = await Bid.findById(bidId).exec();
      if (awardedBid) {
        const chat = await chatService.findChatByJobAndUsers(
          awardedBid.jobId.toString(),
          awardedBid.homeownerId.toString(),
          awardedBid.contractorId.toString()
        );
        if (chat) {
          const msg = `Completion submitted by Homeowner.\nOn‑Time: ${completedOnTime ? 'Yes' : 'No'} (Points: ${awardedBid.onTimeEfficiencyPoints})\nOn‑Budget: ${completedWithinBudget ? 'Yes' : 'No'} (Points: ${awardedBid.onBudgetEfficiencyPoints})`;
          await chatService.createMessage({
            chatId: chat._id as any,
            senderId: awardedBid.homeownerId as any,
            content: msg,
            type: 'system',
            visibleTo: 'contractor',
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to send completion status chat message for bid ${bidId}:`, error);
    }

    return bid;
  }

  /**
   * Update contractor's efficiency ratio
   */
  async updateContractorEfficiencyRatio(contractorId: string): Promise<void> {
    
    // Get all awarded bids for this contractor
    const bids = await Bid.find({
      contractorId: new Types.ObjectId(contractorId),
      bidStatus: 'awarded',
      completionPrompted: true,
    }).exec();

    // Calculate totals
    const totalOnTimePoints = bids.reduce((sum: number, bid: IBidDocument) => sum + (bid.onTimeEfficiencyPoints || 0), 0);
    const totalOnBudgetPoints = bids.reduce((sum: number, bid: IBidDocument) => sum + (bid.onBudgetEfficiencyPoints || 0), 0);
    const totalBidValue = bids.reduce((sum: number, bid: IBidDocument) => sum + bid.bidValue, 0);

    // Update contractor's efficiency points and ratio
    const updateData: any = {
      onTimeEfficiencyPoints: totalOnTimePoints,
      onBudgetEfficiencyPoints: totalOnBudgetPoints,
    };

    if (totalBidValue > 0) {
      updateData.efficiencyRatioValue = (totalOnTimePoints + totalOnBudgetPoints) / totalBidValue;
    } else {
      updateData.efficiencyRatioValue = 0;
    }

    await User.findByIdAndUpdate(contractorId, updateData).exec();
  }

  /**
   * Find bids that need completion prompts (1 day after due date)
   */
  async findBidsNeedingCompletionPrompt(): Promise<IBidDocument[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return Bid.find({
      bidStatus: 'awarded',
      awardFeeStatus: 'completed',
      projectDueDate: { $lte: oneDayAgo },
      completionPrompted: { $ne: true },
    })
      .populate('homeowner', 'firstName lastName email')
      .populate('contractor', 'firstName lastName email')
      .populate('job', 'jobTitle jobNumber')
      .exec();
  }

  /**
   * Find bids that need extension prompts (on due date)
   */
  async findBidsNeedingExtensionPrompt(): Promise<IBidDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Bid.find({
      bidStatus: 'awarded',
      awardFeeStatus: 'completed',
      projectDueDate: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate('contractor', 'firstName lastName email')
      .populate('job', 'jobTitle jobNumber')
      .exec();
  }
}

export default new BidService();

