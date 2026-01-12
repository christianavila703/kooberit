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
import socketService from '@/socket/socket';

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
   * Find chat by ID with only access-control fields (no populates).
   * This is used by endpoints that only need to verify membership and/or read jobId.
   */
  async findChatAccessById(id: string): Promise<IChatDocument | null> {
    if (!id) return null;
    return Chat.findById(id).select('homeownerId contractorId jobId').exec();
  }

  /**
   * Find all chats for a user
   */
  async findChatsByUser(userId: string, role: UserRole): Promise<IChatDocument[]> {
    const filter: any = role === USER_ROLES.HOMEOWNER 
      ? { homeownerId: new Types.ObjectId(userId) }
      : { contractorId: new Types.ObjectId(userId) };

    const chats = await Chat.find(filter)
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('job', 'description categories status')
      .exec();

    // Sort by "activityAt" so new chats with no messages (no lastMessageAt) still appear first.
    // activityAt = lastMessageAt ?? createdAt
    chats.sort((a, b) => {
      const aActivity = (a.lastMessageAt ?? a.createdAt ?? new Date(0)).getTime();
      const bActivity = (b.lastMessageAt ?? b.createdAt ?? new Date(0)).getTime();
      if (bActivity !== aActivity) return bActivity - aActivity;

      const aCreated = (a.createdAt ?? new Date(0)).getTime();
      const bCreated = (b.createdAt ?? new Date(0)).getTime();
      if (bCreated !== aCreated) return bCreated - aCreated;

      // Final deterministic tie-breaker
      return b._id.toString().localeCompare(a._id.toString());
    });

    return chats;
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
  async createMessage(
    messageData: IMessageCreationAttributes,
    options?: { broadcast?: boolean }
  ): Promise<IMessageDocument> {
    const visibleTo = (messageData as any).visibleTo ?? 'both';

    const message = await Message.create({
      ...messageData,
      chatId: new Types.ObjectId(messageData.chatId),
      senderId: new Types.ObjectId(messageData.senderId),
      isRead: false,
      visibleTo,
    });

    // Populate sender before returning
    await message.populate('sender', 'firstName lastName email phone');

    // Update chat metadata + unread counts
    const chat = await Chat.findById(messageData.chatId).exec();
    if (chat) {
      const senderId = messageData.senderId.toString();
      const homeownerId = chat.homeownerId.toString();
      const contractorId = chat.contractorId.toString();
      const isSenderHomeowner = homeownerId === senderId;

      // Determine the intended recipient for unread counting (avoid incrementing the sender)
      let recipientId: string | null = null;
      if (visibleTo === 'both') {
        recipientId = isSenderHomeowner ? contractorId : homeownerId;
      } else if (visibleTo === USER_ROLES.HOMEOWNER || visibleTo === 'homeowner') {
        recipientId = homeownerId;
      } else if (visibleTo === USER_ROLES.CONTRACTOR || visibleTo === 'contractor') {
        recipientId = contractorId;
      }

      const update: any = {};

      // Only update shared lastMessage fields when message is visible to both users
      if (visibleTo === 'both') {
        update.lastMessage = messageData.content;
        update.lastMessageAt = new Date();
      }

      // Unread count only increments for the recipient (and only when recipient != sender)
      if (recipientId && recipientId !== senderId) {
        if (recipientId === homeownerId) {
          update.homeownerUnreadCount = chat.homeownerUnreadCount + 1;
        } else if (recipientId === contractorId) {
          update.contractorUnreadCount = chat.contractorUnreadCount + 1;
        }
      }

      if (Object.keys(update).length > 0) {
        await Chat.findByIdAndUpdate(messageData.chatId, update).exec();
      }

      // Broadcast (used for system messages created outside the chat sendMessage API flow)
      if (options?.broadcast) {
        const messageDataOut = message.toObject({ virtuals: true });

        if (visibleTo === 'both') {
          // Emit to chat room (for users currently in the chat)
          socketService.emitToChat(chat._id.toString(), 'new_message', messageDataOut);

          // Also emit to the recipient's personal room (so they receive it even when not in the chat)
          if (recipientId) {
            socketService.emitToUser(recipientId, 'new_message', messageDataOut);
          }
        } else if (recipientId) {
          // Role-specific visibility: only emit to the target user's personal room
          socketService.emitToUser(recipientId, 'new_message', messageDataOut);
        }
      }
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
    const match =
      role === USER_ROLES.HOMEOWNER
        ? { homeownerId: new Types.ObjectId(userId) }
        : { contractorId: new Types.ObjectId(userId) };

    const sumField =
      role === USER_ROLES.HOMEOWNER ? '$homeownerUnreadCount' : '$contractorUnreadCount';

    const result = await Chat.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: sumField } } },
    ]).exec();

    return result[0]?.total || 0;
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
    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: homeownerId as any,
        content: 'Your bid has been submitted successfully. The homeowner will review it and notify you of their decision.',
        type: 'system',
        visibleTo: USER_ROLES.CONTRACTOR as any,
      } as any,
      { broadcast: true }
    );

    // Message for homeowner
    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: contractorId as any,
        content: `A new bid has been submitted for this job. You can review it in the Contractors tab.`,
        type: 'system',
        visibleTo: USER_ROLES.HOMEOWNER as any,
      } as any,
      { broadcast: true }
    );
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

    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: homeownerId as any,
        content: contractorContent,
        type: 'system',
        visibleTo: USER_ROLES.CONTRACTOR as any,
      } as any,
      { broadcast: true }
    );

    // Message for homeowner
    let homeownerContent = '';
    if (bid.passFeeToHomeowner) {
      homeownerContent = `You have awarded this bid. The award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) is included in the bid amount and must be paid before the project can proceed.`;
    } else {
      homeownerContent = `You have awarded this bid. The contractor must pay the award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) before they can send messages.`;
    }

    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: contractorId as any,
        content: homeownerContent,
        type: 'system',
        visibleTo: USER_ROLES.HOMEOWNER as any,
      } as any,
      { broadcast: true }
    );
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
    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: homeownerId as any,
        content: 'Your Bid Was Not Selected. The homeowner has chosen to move forward with another bid. You can still view the job details.',
        type: 'system',
        visibleTo: USER_ROLES.CONTRACTOR as any,
      } as any,
      { broadcast: true }
    );

    // Message for homeowner
    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: contractorId as any,
        content: 'You have chosen to move forward with another bid for this job.',
        type: 'system',
        visibleTo: USER_ROLES.HOMEOWNER as any,
      } as any,
      { broadcast: true }
    );
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

    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: homeownerId as any,
        content: contractorContent,
        type: 'system',
        visibleTo: USER_ROLES.CONTRACTOR as any,
      } as any,
      { broadcast: true }
    );

    // Message for homeowner
    const homeownerContent = payerRole === USER_ROLES.HOMEOWNER
      ? `You have paid the award fee of $${awardFeeAmount.toFixed(2)}. The project can now proceed.`
      : `The contractor has paid the award fee of $${awardFeeAmount.toFixed(2)}. Messaging is now enabled.`;

    await this.createMessage(
      {
        chatId: chatId as any,
        senderId: contractorId as any,
        content: homeownerContent,
        type: 'system',
        visibleTo: USER_ROLES.HOMEOWNER as any,
      } as any,
      { broadcast: true }
    );
  }
}

export default new ChatService();

