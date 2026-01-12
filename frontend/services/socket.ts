import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/constants/config';
import { getAuthToken } from '@/libs/authToken';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private connectPromise: Promise<Socket> | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      if (this.connectPromise) return this.connectPromise;
      // Fallback: should not happen, but avoid hanging forever
      throw new Error('Socket connection already in progress');
    }

    this.isConnecting = true;

    try {
      const token = await getAuthToken();
      // Get base URL without /api
      const baseURL = API_CONFIG.BASE_URL.replace('/api', '');
      // For development, use localhost or IP
      const socketURL = baseURL.includes('localhost') || baseURL.includes('127.0.0.1') || baseURL.includes('10.0.2.2')
        ? baseURL
        : baseURL;

      this.connectPromise = new Promise<Socket>((resolve, reject) => {
        this.socket = io(socketURL, {
          auth: {
            token,
          },
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          if (__DEV__) console.log('Socket connected');
          this.isConnecting = false;
          resolve(this.socket!);
        });

        this.socket.on('disconnect', () => {
          if (__DEV__) console.log('Socket disconnected');
        });

        this.socket.on('error', (error) => {
          if (__DEV__) console.error('Socket error:', error);
          this.isConnecting = false;
          reject(error);
        });
      }).finally(() => {
        this.connectPromise = null;
      });

      return await this.connectPromise;
    } catch (error) {
      if (__DEV__) console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.connectPromise = null;
      throw error;
    }
  }

  disconnect() {
    this.isConnecting = false;
    this.connectPromise = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join chat room
  joinChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_chat', chatId);
    }
  }

  // Leave chat room
  leaveChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  // Send message
  sendMessage(chatId: string, content: string, type: string = 'text', fileUrl?: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', { chatId, content, type, fileUrl });
    }
  }

  // Typing indicator
  startTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { chatId });
    }
  }

  // Stop typing
  stopTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', { chatId });
    }
  }

  // Mark messages as read
  markRead(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { chatId });
    }
  }

  // Listen to events
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove listener
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService();

