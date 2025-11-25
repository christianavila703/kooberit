import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '@/utils/jwt';
import authService from '@/services/authService';
import chatService from '@/services/chatService';
import logger from '@/utils/logger';
import { CORS_ALLOWED_ORIGINS } from '@/config/constants';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private typingUsers: Map<string, Set<string>> = new Map(); // chatId -> Set of userIds

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: CORS_ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = verifyToken(token);
        const user = await authService.verifyUserStatus(decoded.id);

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error: any) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.userId}`);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Join chat room
      socket.on('join_chat', async (chatId: string) => {
        if (!chatId || typeof chatId !== 'string') {
          logger.error(`Invalid chatId received: ${chatId}`);
          return;
        }
        socket.join(`chat:${chatId}`);
        logger.info(`User ${socket.userId} joined chat ${chatId}`);
      });

      // Leave chat room
      socket.on('leave_chat', (chatId: string) => {
        if (!chatId || typeof chatId !== 'string') {
          logger.error(`Invalid chatId received: ${chatId}`);
          return;
        }
        socket.leave(`chat:${chatId}`);
        this.typingUsers.delete(chatId);
        logger.info(`User ${socket.userId} left chat ${chatId}`);
      });

      // Note: Message creation is handled by API endpoint
      // Socket is only used for broadcasting messages created via API
      // This prevents duplicate message creation

      // Typing indicator
      socket.on('typing', (data: { chatId: string }) => {
        if (!socket.userId) return;

        if (!data.chatId || typeof data.chatId !== 'string') {
          return;
        }

        if (!this.typingUsers.has(data.chatId)) {
          this.typingUsers.set(data.chatId, new Set());
        }
        this.typingUsers.get(data.chatId)!.add(socket.userId);

        // Emit to other users in the chat
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          chatId: data.chatId,
          userId: socket.userId,
        });
      });

      // Stop typing
      socket.on('stop_typing', (data: { chatId: string }) => {
        if (!socket.userId) return;

        if (!data.chatId || typeof data.chatId !== 'string') {
          return;
        }

        this.stopTyping(data.chatId, socket.userId);
      });

      // Mark messages as read
      socket.on('mark_read', async (data: { chatId: string }) => {
        try {
          if (!socket.userId) return;

          if (!data.chatId || typeof data.chatId !== 'string') {
            return;
          }

          await chatService.markMessagesAsRead(data.chatId, socket.userId);

          // Notify other user
          this.io!.to(`chat:${data.chatId}`).emit('messages_read', {
            chatId: data.chatId,
            userId: socket.userId,
          });
        } catch (error: any) {
          logger.error('Mark read error:', error);
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.userId}`);
        // Clean up typing indicators
        this.typingUsers.forEach((users, chatId) => {
          if (socket.userId && users.has(socket.userId)) {
            users.delete(socket.userId);
            if (users.size === 0) {
              this.typingUsers.delete(chatId);
            } else {
              socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
                chatId,
                userId: socket.userId,
              });
            }
          }
        });
      });
    });

    return this.io;
  }

  private stopTyping(chatId: string, userId: string) {
    const users = this.typingUsers.get(chatId);
    if (users && users.has(userId)) {
      users.delete(userId);
      if (users.size === 0) {
        this.typingUsers.delete(chatId);
      }
      this.io!.to(`chat:${chatId}`).emit('user_stopped_typing', {
        chatId,
        userId,
      });
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  // Emit to chat room
  emitToChat(chatId: string, event: string, data: any) {
    this.io?.to(`chat:${chatId}`).emit(event, data);
  }
}

export default new SocketService();

