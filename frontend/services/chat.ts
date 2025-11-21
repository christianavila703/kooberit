import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import type {
  IApiResponse,
  IChat,
  IMessage,
  ISendMessageRequest,
} from '@/types';

/**
 * Chat Service
 */
class ChatService {
  /**
   * Get all chats for user
   */
  async getUserChats(): Promise<IChat[]> {
    const response = await api.get<IApiResponse<IChat[]>>(
      endpoints.chats.getAll
    );
    return response.data.data || [];
  }

  /**
   * Get chat by ID
   */
  async getChatById(id: string): Promise<IChat> {
    const response = await api.get<IApiResponse<IChat>>(
      endpoints.chats.getById(id)
    );
    return response.data.data!;
  }

  /**
   * Get messages for a chat
   */
  async getChatMessages(chatId: string, limit?: number, before?: string): Promise<IMessage[]> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;

    const response = await api.get<IApiResponse<IMessage[]>>(
      endpoints.chats.getMessages(chatId),
      { params }
    );
    return response.data.data || [];
  }

  /**
   * Send a message
   */
  async sendMessage(chatId: string, data: ISendMessageRequest): Promise<IMessage> {
    const response = await api.post<IApiResponse<IMessage>>(
      endpoints.chats.sendMessage(chatId),
      data
    );
    return response.data.data!;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string): Promise<void> {
    await api.patch(endpoints.chats.markAsRead(chatId));
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<IApiResponse<{ count: number }>>(
      endpoints.chats.getUnreadCount
    );
    return response.data.data?.count || 0;
  }
}

export default new ChatService();

