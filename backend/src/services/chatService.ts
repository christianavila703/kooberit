import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { Chat, Message } from '@/models';
import {
  IChatAttributes,
  IChatCreationAttributes,
  IChatDocument,
  IMessageAttributes,
  IMessageCreationAttributes,
  IMessageDocument,
} from '@/types';

/**
 * Chat Service
 */
class ChatService {
  /**
   * Create or get chat room
   */
  async createOrGetChat(chatData: IChatCreationAttributes): Promise<IChatDocument> {
    const existing = await Chat.findOne({
      jobPostId: new Types.ObjectId(chatData.jobPostId),
      homeownerId: new Types.ObjectId(chatData.homeownerId),
      contractorId: new Types.ObjectId(chatData.contractorId),
    }).exec();

    if (existing) {
      return existing;
    }

    const chat = await Chat.create({
      ...chatData,
      jobPostId: new Types.ObjectId(chatData.jobPostId),
      homeownerId: new Types.ObjectId(chatData.homeownerId),
      contractorId: new Types.ObjectId(chatData.contractorId),
      homeownerUnreadCount: 0,
      contractorUnreadCount: 0,
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
      .populate('jobPost', 'description categories status')
      .exec();
  }

  /**
   * Find all chats for a user
   */
  async findChatsByUser(userId: string, role: 'homeowner' | 'contractor'): Promise<IChatDocument[]> {
    const filter: any = role === 'homeowner' 
      ? { homeownerId: new Types.ObjectId(userId) }
      : { contractorId: new Types.ObjectId(userId) };

    return Chat.find(filter)
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('jobPost', 'description categories status')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  /**
   * Find chat by job post and users
   */
  async findChatByJobPostAndUsers(
    jobPostId: string,
    homeownerId: string,
    contractorId: string
  ): Promise<IChatDocument | null> {
    return Chat.findOne({
      jobPostId: new Types.ObjectId(jobPostId),
      homeownerId: new Types.ObjectId(homeownerId),
      contractorId: new Types.ObjectId(contractorId),
    })
      .populate('homeowner', 'firstName lastName email phone')
      .populate('contractor', 'firstName lastName email phone')
      .populate('jobPost', 'description categories status')
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
  async getUnreadCount(userId: string, role: 'homeowner' | 'contractor'): Promise<number> {
    const chats = await Chat.find(
      role === 'homeowner'
        ? { homeownerId: new Types.ObjectId(userId) }
        : { contractorId: new Types.ObjectId(userId) }
    ).exec();

    return chats.reduce(
      (total, chat) =>
        total + (role === 'homeowner' ? chat.homeownerUnreadCount : chat.contractorUnreadCount),
      0
    );
  }
}

export default new ChatService();

