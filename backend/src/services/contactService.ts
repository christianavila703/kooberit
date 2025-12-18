import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { Contact, Chat } from '@/models';
import {
  IContactCreationAttributes,
  IContactDocument,
} from '@/types';
import jobService from './jobService';

/**
 * Contact Service
 */
class ContactService {
  /**
   * Create a new contact
   */
  async createContact(  
    contactData: IContactCreationAttributes
  ): Promise<IContactDocument> {
    // Check if contact already exists
    const existing = await Contact.findOne({
      jobId: new Types.ObjectId(contactData.jobId),
      contractorId: new Types.ObjectId(contactData.contractorId),
    }).exec();

    if (existing) {
      throw new CustomError('You have already contacted this homeowner', 409);
    }

    // Check if job has reached contractor limit
    const job = await jobService.findJobById(contactData.jobId.toString());
    if (!job) {
      throw new CustomError('Job not found', 404);
    }

    if (job.contractorContactsCount >= job.contractorLimit) {
      throw new CustomError('This job has reached its contractor limit', 400);
    }

    // Create chat room
    const chat = await Chat.create({
      jobId: new Types.ObjectId(contactData.jobId),
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
    const contact = await Contact.create({
      ...contactData,
      jobId: new Types.ObjectId(contactData.jobId),
      contractorId: new Types.ObjectId(contactData.contractorId),
      homeownerId: new Types.ObjectId(contactData.homeownerId),
      chatRoomId: chat._id,
      paymentStatus: 'completed',
      contactInfoRevealed: true,
    });

    // Increment contractor contacts count
    await jobService.incrementContractorContactsCount(contactData.jobId.toString());

    return contact;
  }

  /**
   * Find contractor contact by ID
   */
  async findContactById(id: string): Promise<IContactDocument | null> {
    if (!id) {
      return null;
    }
    return Contact.findById(id)
      .populate('contractor', 'firstName lastName email')
      .populate('homeowner', 'firstName lastName email')
      .populate('job')
      .exec();
  }

  /**
   * Find all contractor contacts for a job
   */
  async findContactsByJob(
    jobId: string
  ): Promise<IContactDocument[]> {
    return Contact.find({ jobId: new Types.ObjectId(jobId) })
      .populate('contractor', 'firstName lastName email')
      .populate('chatRoom')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all contractor contacts for a homeowner
   */
  async findContactsByHomeowner(
    homeownerId: string
  ): Promise<IContactDocument[]> {
    return Contact.find({ homeownerId: new Types.ObjectId(homeownerId) })
      .populate('contractor', 'firstName lastName email')
      .populate('job', 'description categories status')
      .populate('chatRoom')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find contractor contact by job and contractor
   */
  async findContactByJobAndContractor(
    jobId: string,
    contractorId: string
  ): Promise<IContactDocument | null> {
    return Contact.findOne({
      jobId: new Types.ObjectId(jobId),
      contractorId: new Types.ObjectId(contractorId),
    })
      .populate('contractor', 'firstName lastName email')
      .populate('chatRoom')
      .exec();
  }

  /**
   * Create contact (used by payment service)
   */
  async createContactWithPayment(
    jobId: string,
    contractorId: string,
    homeownerId: string
  ): Promise<IContactDocument> {
    return this.createContact({
      jobId: jobId as any,
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
  ): Promise<IContactDocument | null> {
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
    return Contact.findByIdAndUpdate(new Types.ObjectId(id), updateData, { new: true }).exec();
  }

  /**
   * Link chat to contact
   */
  async linkChatToContact(contactId: string, chatId: string): Promise<IContactDocument | null> {
    return Contact.findByIdAndUpdate(
      new Types.ObjectId(contactId),
      { chatRoomId: new Types.ObjectId(chatId) },
      { new: true }
    ).exec();
  }
}

export default new ContactService();

