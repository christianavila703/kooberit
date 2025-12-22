import { Request, Response } from 'express';
import chatService from '@/services/chatService';
import logger from '@/utils/logger';

/**
 * Get all chats for user
 */
export const getUserChats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Get role from query parameter (mode from frontend) or fallback to user's actual role
    const requestedRole = (req.query.role as 'homeowner' | 'contractor') || user.role;
    const role = requestedRole as 'homeowner' | 'contractor';

    // Validate role
    if (role !== 'homeowner' && role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
      });
    }

    // For contractors, allow switching to homeowner mode
    // For homeowners, only allow homeowner mode
    if (user.role === 'homeowner' && role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Homeowners can only access homeowner mode',
      });
    }

    const chats = await chatService.findChatsByUser(user.id, role);

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    const chatsData = chats.map((chat) => chat.toObject({ virtuals: true }));

    return res.status(200).json({
      success: true,
      message: 'Chats retrieved successfully',
      data: chatsData,
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

    // Serialize chat with virtuals included (toJSON handles this automatically)
    const chatData = chat.toObject ? chat.toObject({ virtuals: true }) : chat;

    return res.status(200).json({
      success: true,
      message: 'Chat retrieved successfully',
      data: chatData,
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

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    const messagesData = messages.map((message) => 
      message.toObject({ virtuals: true })
    );

    return res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: messagesData.reverse(), // Reverse to show oldest first
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
      chatId: chatId as any,
      senderId: user.id as any,
      content,
      type,
      fileUrl,
    });

    // Mongoose automatically converts ObjectIds to strings in JSON
    // Serialize with virtuals included
    const messageData = message.toObject({ virtuals: true });

    // Broadcast to other users via socket (sender gets message from API response)
    const { default: socketService } = await import('@/socket/socket');
    const io = socketService.getIO();
    if (io) {
      // Get the recipient user ID (the other person in the chat)
      const recipientId = isHomeowner 
        ? chat.contractorId.toString() 
        : chat.homeownerId.toString();
      
      // Emit to chat room (for users currently in the chat)
      io.to(`chat:${chatId}`).emit('new_message', messageData);
      
      // Also emit to recipient's personal room (so they receive it even when not in the chat)
      // This allows the messages list screen to receive updates
      socketService.emitToUser(recipientId, 'new_message', messageData);
    }

    logger.info(`Message sent: ${message._id} in chat: ${chatId} by user: ${user.id}`);

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData,
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

    // Broadcast to other users via socket
    const { default: socketService } = await import('@/socket/socket');
    const io = socketService.getIO();
    if (io) {
      // Get the recipient user ID (the other person in the chat)
      const recipientId = isHomeowner 
        ? chat.contractorId.toString() 
        : chat.homeownerId.toString();
      
      const readData = {
        chatId,
        userId: user.id,
      };
      
      // Emit to chat room (for users currently in the chat)
      io.to(`chat:${chatId}`).emit('messages_read', readData);
      
      // Also emit to recipient's personal room (so they receive it even when not in the chat)
      socketService.emitToUser(recipientId, 'messages_read', readData);
    }

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
    // Get role from query parameter (mode from frontend) or fallback to user's actual role
    const requestedRole = (req.query.role as 'homeowner' | 'contractor') || user.role;
    const role = requestedRole as 'homeowner' | 'contractor';

    // Validate role
    if (role !== 'homeowner' && role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid user role',
      });
    }

    // For contractors, allow switching to homeowner mode
    // For homeowners, only allow homeowner mode
    if (user.role === 'homeowner' && role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Homeowners can only access homeowner mode',
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

