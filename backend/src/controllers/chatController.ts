import { Request, Response } from 'express';
import chatService from '@/services/chatService';
import logger from '@/utils/logger';

/**
 * Get all chats for user
 */
export const getUserChats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user.role as 'homeowner' | 'contractor';

    if (role !== 'homeowner' && role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
      });
    }

    const chats = await chatService.findChatsByUser(user.id, role);

    return res.status(200).json({
      success: true,
      message: 'Chats retrieved successfully',
      data: chats,
    });
  } catch (error: any) {
    logger.error('Get user chats error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get chat by ID
 */
export const getChatById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const chat = await chatService.findChatById(id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Verify user has access to this chat
    const isHomeowner = chat.homeownerId.toString() === user.id;
    const isContractor = chat.contractorId.toString() === user.id;

    if (!isHomeowner && !isContractor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat retrieved successfully',
      data: chat,
    });
  } catch (error: any) {
    logger.error('Get chat error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get messages for a chat
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    // Verify user has access to this chat
    const chat = await chatService.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isHomeowner = chat.homeownerId.toString() === user.id;
    const isContractor = chat.contractorId.toString() === user.id;

    if (!isHomeowner && !isContractor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const messages = await chatService.findMessagesByChatId(chatId, limit, before);

    return res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: messages.reverse(), // Reverse to show oldest first
    });
  } catch (error: any) {
    logger.error('Get chat messages error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Send a message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const user = (req as any).user;
    const { content, type = 'text', fileUrl } = req.body;

    // Verify user has access to this chat
    const chat = await chatService.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isHomeowner = chat.homeownerId.toString() === user.id;
    const isContractor = chat.contractorId.toString() === user.id;

    if (!isHomeowner && !isContractor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const message = await chatService.createMessage({
      chatId,
      senderId: user.id,
      content,
      type,
      fileUrl,
    });

    logger.info(`Message sent: ${message._id} in chat: ${chatId} by user: ${user.id}`);

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error: any) {
    logger.error('Send message error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const user = (req as any).user;

    // Verify user has access to this chat
    const chat = await chatService.findChatById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const isHomeowner = chat.homeownerId.toString() === user.id;
    const isContractor = chat.contractorId.toString() === user.id;

    if (!isHomeowner && !isContractor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await chatService.markMessagesAsRead(chatId, user.id);

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    logger.error('Mark messages as read error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get unread count for user
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user.role as 'homeowner' | 'contractor';

    if (role !== 'homeowner' && role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
      });
    }

    const count = await chatService.getUnreadCount(user.id, role);

    return res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { count },
    });
  } catch (error: any) {
    logger.error('Get unread count error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

