import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { Chat, Message, Bid } from '@/models';
import {
  IChatAttributes,
  IChatCreationAttributes,
  IChatDocument,
  IMessageAttributes,
  IMessageCreationAttributes,
  IMessageDocument,
  UserRole,
} from '@/types';
import { USER_ROLES } from '@enums';

/**
 * Chat Service
 */
class ChatService {
  /**
   * Create or get chat room
   */
  async createOrGetChat(chatData: IChatCreationAttributes): Promise<IChatDocument> {
    const existing = await Chat.findOne({
      jobId: new Types.ObjectId(chatData.jobId),
      homeownerId: new Types.ObjectId(chatData.homeownerId),
      contractorId: new Types.ObjectId(chatData.contractorId),
    }).exec();

    if (existing) {
      return existing;
    }

    const chat = await Chat.create({
      ...chatData,
      jobId: new Types.ObjectId(chatData.jobId),
      homeownerId: new Types.ObjectId(chatData.homeownerId),
      contractorId: new Types.ObjectId(chatData.contractorId),
      homeownerUnreadCount: 1,
      contractorUnreadCount: 1,
    });

    // Create system message with disclaimer
    const systemMessageContent = "The purpose of this chat is to set up a site visit and communicate any other project details such as cost and deadline. It is recommended that all relevant project communication occur on the app. The communication creates a written record that can be used in cases of dispute.";
    
    await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId(chatData.contractorId), // Use contractorId as sender for system messages
      content: systemMessageContent,
      type: 'system',
      isRead: false,
    });

    return chat;
  }

  /**
   * Find chat by ID
   */
  async findChatById(id: string): Promise<IChatDocument | null> {
    if (!id) {
      return null;
    }
    return Chat.findById(id)
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('job', 'description categories status')
      .exec();
  }

  /**
   * Find all chats for a user
   */
  async findChatsByUser(userId: string, role: UserRole): Promise<IChatDocument[]> {
    const filter: any = role === USER_ROLES.HOMEOWNER 
      ? { homeownerId: new Types.ObjectId(userId) }
      : { contractorId: new Types.ObjectId(userId) };

    return Chat.find(filter)
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('job', 'description categories status')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  /**
   * Find chat by job and users
   */
  async findChatByJobAndUsers(
    jobId: string,
    homeownerId: string,
    contractorId: string
  ): Promise<IChatDocument | null> {
    return Chat.findOne({
      jobId: new Types.ObjectId(jobId),
      homeownerId: new Types.ObjectId(homeownerId),
      contractorId: new Types.ObjectId(contractorId),
    })
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('job', 'description categories status')
      .exec();
  }

  /**
   * Create a new message
   */
  async createMessage(messageData: IMessageCreationAttributes): Promise<IMessageDocument> {
    const message = await Message.create({
      ...messageData,
      chatId: new Types.ObjectId(messageData.chatId),
      senderId: new Types.ObjectId(messageData.senderId),
      isRead: false,
      visibleTo: 'both',
    });

    // Populate sender before returning
    await message.populate('sender', 'firstName lastName email phone');

    // Update chat's last message
    const chat = await Chat.findById(messageData.chatId).exec();
    if (chat) {
      const isHomeowner = chat.homeownerId.toString() === messageData.senderId.toString();
      await Chat.findByIdAndUpdate(messageData.chatId, {
        lastMessage: messageData.content,
        lastMessageAt: new Date(),
        ...(isHomeowner
          ? { contractorUnreadCount: chat.contractorUnreadCount + 1 }
          : { homeownerUnreadCount: chat.homeownerUnreadCount + 1 }),
      }).exec();
    }

    return message;
  }

  /**
   * Find messages by chat ID
   */
  async findMessagesByChatId(
    chatId: string,
    limit: number = 50,
    before?: string
  ): Promise<IMessageDocument[]> {
    const filter: any = { chatId: new Types.ObjectId(chatId) };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    return Message.find(filter)
      .populate('sender', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const chat = await Chat.findById(chatId).exec();
    if (!chat) {
      throw new CustomError('Chat not found', 404);
    }

    const isHomeowner = chat.homeownerId.toString() === userId;
    const filter: any = {
      chatId: new Types.ObjectId(chatId),
      senderId: { $ne: new Types.ObjectId(userId) },
      isRead: false,
    };

    await Message.updateMany(filter, {
      isRead: true,
      readAt: new Date(),
    }).exec();

    // Reset unread count
    if (isHomeowner) {
      await Chat.findByIdAndUpdate(chatId, { homeownerUnreadCount: 0 }).exec();
    } else {
      await Chat.findByIdAndUpdate(chatId, { contractorUnreadCount: 0 }).exec();
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string, role: UserRole): Promise<number> {
    const chats = await Chat.find(
      role === USER_ROLES.HOMEOWNER
        ? { homeownerId: new Types.ObjectId(userId) }
        : { contractorId: new Types.ObjectId(userId) }
    ).exec();

    return chats.reduce(
      (total, chat) =>
        total + (role === USER_ROLES.HOMEOWNER ? chat.homeownerUnreadCount : chat.contractorUnreadCount),
      0
    );
  }

  /**
   * Create system message when a bid is submitted
   */
  async createBidSubmittedMessage(chatId: string, contractorId: string, homeownerId: string): Promise<void> {
    const chat = await this.findChatById(chatId);
    if (!chat || !chat.jobId) {
      return;
    }

    const bid = await Bid.findOne({
      jobId: chat.jobId,
      contractorId: new Types.ObjectId(contractorId),
    }).exec();

    if (!bid) {
      return;
    }

    // Message for contractor
    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(homeownerId),
      content: 'Your bid has been submitted successfully. The homeowner will review it and notify you of their decision.',
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.CONTRACTOR,
    });

    // Message for homeowner
    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(contractorId),
      content: `A new bid has been submitted for this job. You can review it in the Contractors tab.`,
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.HOMEOWNER,
    });

    // Increment unread counts
    await Chat.findByIdAndUpdate(chatId, {
      $inc: {
        contractorUnreadCount: 1,
        homeownerUnreadCount: 1,
      },
    }).exec();
  }

  /**
   * Create system message when a bid is awarded
   */
  async createBidAwardedMessage(chatId: string, contractorId: string, homeownerId: string): Promise<void> {
    const chat = await this.findChatById(chatId);
    if (!chat || !chat.jobId) {
      return;
    }

    const bid = await Bid.findOne({
      jobId: chat.jobId,
      contractorId: new Types.ObjectId(contractorId),
    }).exec();

    if (!bid || bid.bidStatus !== 'awarded') {
      return;
    }

    // Message for contractor
    let contractorContent = '';
    if (bid.passFeeToHomeowner) {
      contractorContent = '🎉 Your Bid Has Been Awarded! The homeowner will pay the award fee. You can continue messaging.';
    } else if (bid.awardFeeStatus === 'completed') {
      contractorContent = '🎉 Your Bid Has Been Awarded! Award fee paid. You can continue messaging.';
    } else {
      contractorContent = '🎉 Your Bid Has Been Awarded! Please pay the award fee to continue messaging. Go to the Bid tab on the job page to pay.';
    }

    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(homeownerId),
      content: contractorContent,
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.CONTRACTOR,
    });

    // Message for homeowner
    let homeownerContent = '';
    if (bid.passFeeToHomeowner) {
      homeownerContent = `You have awarded this bid. The award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) is included in the bid amount and must be paid before the project can proceed.`;
    } else {
      homeownerContent = `You have awarded this bid. The contractor must pay the award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) before they can send messages.`;
    }

    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(contractorId),
      content: homeownerContent,
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.HOMEOWNER,
    });

    // Increment unread counts
    await Chat.findByIdAndUpdate(chatId, {
      $inc: {
        contractorUnreadCount: 1,
        homeownerUnreadCount: 1,
      },
    }).exec();
  }

  /**
   * Create system message when a bid is rejected
   */
  async createBidRejectedMessage(chatId: string, contractorId: string, homeownerId: string): Promise<void> {
    const chat = await this.findChatById(chatId);
    if (!chat || !chat.jobId) {
      return;
    }

    // Message for contractor
    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(homeownerId),
      content: 'Your Bid Was Not Selected. The homeowner has chosen to move forward with another bid. You can still view the job details.',
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.CONTRACTOR,
    });

    // Message for homeowner
    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(contractorId),
      content: 'You have chosen to move forward with another bid for this job.',
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.HOMEOWNER,
    });

    // Increment unread counts
    await Chat.findByIdAndUpdate(chatId, {
      $inc: {
        contractorUnreadCount: 1,
        homeownerUnreadCount: 1,
      },
    }).exec();
  }

  /**
   * Create system message when award fee is paid
   */
  async createAwardFeePaidMessage(chatId: string, contractorId: string, homeownerId: string, payerRole: UserRole, awardFeeAmount: number): Promise<void> {
    const chat = await this.findChatById(chatId);
    if (!chat || !chat.jobId) {
      return;
    } 

    // Message for contractor
    const contractorContent = payerRole === USER_ROLES.CONTRACTOR
      ? `The award fee of $${awardFeeAmount.toFixed(2)} has been paid. Messaging is now enabled.`
      : `The homeowner has paid the award fee of $${awardFeeAmount.toFixed(2)}. The project can now proceed.`;

    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(homeownerId),
      content: contractorContent,
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.CONTRACTOR,
    });

    // Message for homeowner
    const homeownerContent = payerRole === USER_ROLES.HOMEOWNER
      ? `You have paid the award fee of $${awardFeeAmount.toFixed(2)}. The project can now proceed.`
      : `The contractor has paid the award fee of $${awardFeeAmount.toFixed(2)}. Messaging is now enabled.`;

    await Message.create({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(contractorId),
      content: homeownerContent,
      type: 'system',
      isRead: false,
      visibleTo: USER_ROLES.HOMEOWNER,
    });

    // Increment unread counts
    await Chat.findByIdAndUpdate(chatId, {
      $inc: {
        contractorUnreadCount: 1,
        homeownerUnreadCount: 1,
      },
    }).exec();
  }
}

export default new ChatService();

