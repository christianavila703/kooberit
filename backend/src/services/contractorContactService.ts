import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { ContractorContact, Chat } from '@/models';
import {
  IContractorContactAttributes,
  IContractorContactCreationAttributes,
  IContractorContactDocument,
} from '@/types';
import jobPostService from './jobPostService';

/**
 * Contractor Contact Service
 */
class ContractorContactService {
  /**
   * Create a new contractor contact
   */
  async createContractorContact(
    contactData: IContractorContactCreationAttributes
  ): Promise<IContractorContactDocument> {
    // Check if contact already exists
    const existing = await ContractorContact.findOne({
      jobPostId: new Types.ObjectId(contactData.jobPostId),
      contractorId: new Types.ObjectId(contactData.contractorId),
    }).exec();

    if (existing) {
      throw new CustomError('You have already contacted this homeowner', 409);
    }

    // Check if job post has reached contractor limit
    const jobPost = await jobPostService.findJobPostById(contactData.jobPostId.toString());
    if (!jobPost) {
      throw new CustomError('Job post not found', 404);
    }

    if (jobPost.contractorContactsCount >= jobPost.contractorLimit) {
      throw new CustomError('This job post has reached its contractor limit', 400);
    }

    // Create chat room
    const chat = await Chat.create({
      jobPostId: new Types.ObjectId(contactData.jobPostId),
      homeownerId: new Types.ObjectId(contactData.homeownerId),
      contractorId: new Types.ObjectId(contactData.contractorId),
      homeownerUnreadCount: 0,
      contractorUnreadCount: 0,
    });

    // Create system message with disclaimer
    const { Message } = await import('@/models');
    const systemMessageContent = "The purpose of this chat is to set up a site visit and communicate any other project details such as cost and deadline. It is recommended that all relevant project communication occur on the app. The communication creates a written record that can be used in cases of dispute.";
    
    await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId(contactData.contractorId), // Use contractorId as sender for system messages
      content: systemMessageContent,
      type: 'system',
      isRead: false,
    });

    // Create contractor contact
    const contact = await ContractorContact.create({
      ...contactData,
      jobPostId: new Types.ObjectId(contactData.jobPostId),
      contractorId: new Types.ObjectId(contactData.contractorId),
      homeownerId: new Types.ObjectId(contactData.homeownerId),
      chatRoomId: chat._id,
      paymentStatus: 'completed',
      contactInfoRevealed: true,
    });

    // Increment contractor contacts count
    await jobPostService.incrementContractorContactsCount(contactData.jobPostId.toString());

    return contact;
  }

  /**
   * Find contractor contact by ID
   */
  async findContractorContactById(id: string): Promise<IContractorContactDocument | null> {
    if (!id) {
      return null;
    }
    return ContractorContact.findById(id)
      .populate('contractor', 'firstName lastName email')
      .populate('homeowner', 'firstName lastName email')
      .populate('jobPost')
      .exec();
  }

  /**
   * Find all contractor contacts for a job post
   */
  async findContractorContactsByJobPost(
    jobPostId: string
  ): Promise<IContractorContactDocument[]> {
    return ContractorContact.find({ jobPostId: new Types.ObjectId(jobPostId) })
      .populate('contractor', 'firstName lastName email')
      .populate('chatRoom')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all contractor contacts for a homeowner
   */
  async findContractorContactsByHomeowner(
    homeownerId: string
  ): Promise<IContractorContactDocument[]> {
    return ContractorContact.find({ homeownerId: new Types.ObjectId(homeownerId) })
      .populate('contractor', 'firstName lastName email')
      .populate('jobPost', 'description categories status')
      .populate('chatRoom')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find contractor contact by job post and contractor
   */
  async findContractorContactByJobPostAndContractor(
    jobPostId: string,
    contractorId: string
  ): Promise<IContractorContactDocument | null> {
    return ContractorContact.findOne({
      jobPostId: new Types.ObjectId(jobPostId),
      contractorId: new Types.ObjectId(contractorId),
    })
      .populate('contractor', 'firstName lastName email')
      .populate('chatRoom')
      .exec();
  }

  /**
   * Create contact (used by payment service)
   */
  async createContact(
    jobPostId: string,
    contractorId: string,
    homeownerId: string
  ): Promise<IContractorContactDocument> {
    return this.createContractorContact({
      jobPostId: jobPostId as any,
      contractorId: contractorId as any,
      homeownerId: homeownerId as any,
      paymentAmount: 19.99,
      paymentStatus: 'pending' as const,
    });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded',
    paymentData?: { paymentIntentId?: string; paymentDate?: Date }
  ): Promise<IContractorContactDocument | null> {
    const updateData: any = { paymentStatus };
    if (paymentData?.paymentIntentId) {
      updateData.paymentTransactionId = paymentData.paymentIntentId;
    }
    if (paymentData?.paymentDate) {
      updateData.paymentDate = paymentData.paymentDate;
    }
    if (paymentStatus === 'completed') {
      updateData.contactInfoRevealed = true;
    }
    return ContractorContact.findByIdAndUpdate(new Types.ObjectId(id), updateData, { new: true }).exec();
  }

  /**
   * Link chat to contact
   */
  async linkChatToContact(contactId: string, chatId: string): Promise<IContractorContactDocument | null> {
    return ContractorContact.findByIdAndUpdate(
      new Types.ObjectId(contactId),
      { chatRoomId: new Types.ObjectId(chatId) },
      { new: true }
    ).exec();
  }
}

export default new ContractorContactService();

