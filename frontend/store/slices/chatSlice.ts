import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import chatService from '@/services/chat';
import type {
  IChat,
  IMessage,
  ISendMessageRequest,
} from '@/types';

interface IChatState {
  chats: IChat[];
  currentChat: IChat | null;
  messages: { [chatId: string]: IMessage[] };
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: IChatState = {
  chats: [],
  currentChat: null,
  messages: {},
  unreadCount: 0,
  isLoading: false,
  error: null,
};

/**
 * Fetch user chats
 */
export const fetchUserChats = createAsyncThunk(
  'chat/fetchUserChats',
  async (_, { rejectWithValue }) => {
    try {
      const chats = await chatService.getUserChats();
      return chats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chats');
    }
  }
);

/**
 * Fetch chat by ID
 */
export const fetchChatById = createAsyncThunk(
  'chat/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const chat = await chatService.getChatById(id);
      return chat;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chat');
    }
  }
);

/**
 * Fetch chat messages
 */
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ chatId, limit, before }: { chatId: string; limit?: number; before?: string }, { rejectWithValue }) => {
    try {
      const messages = await chatService.getChatMessages(chatId, limit, before);
      return { chatId, messages };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Send message
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, data }: { chatId: string; data: ISendMessageRequest }, { rejectWithValue }) => {
    try {
      const message = await chatService.sendMessage(chatId, data);
      return { chatId, message };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

/**
 * Mark messages as read
 */
export const markMessagesAsRead = createAsyncThunk(
  'chat/markAsRead',
  async (chatId: string, { rejectWithValue, getState }) => {
    try {
      await chatService.markMessagesAsRead(chatId);
      // Get current user ID from auth state
      const state = getState() as any;
      const currentUserId = state.auth?.user?.id;
      return { chatId, currentUserId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark messages as read');
    }
  }
);

/**
 * Fetch unread count
 */
export const fetchUnreadCount = createAsyncThunk(
  'chat/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const count = await chatService.getUnreadCount();
      return count;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread count');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentChat: (state, action: PayloadAction<IChat | null>) => {
      state.currentChat = action.payload;
    },
    addMessage: (state, action: PayloadAction<{ chatId: string; message: IMessage }>) => {
      const { chatId, message } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      // Prevent duplicate messages by checking if message ID already exists
      const existingIndex = state.messages[chatId].findIndex((m) => m.id === message.id);
      if (existingIndex === -1) {
        state.messages[chatId].push(message);
      }
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      state.messages[action.payload] = [];
    },
    markMessagesAsReadInChat: (state, action: PayloadAction<{ chatId: string; currentUserId: string }>) => {
      const { chatId, currentUserId } = action.payload;
      // Only mark messages from other users as read
      if (state.messages[chatId]) {
        state.messages[chatId].forEach((msg) => {
          if (msg.senderId !== currentUserId && !msg.isRead) {
            msg.isRead = true;
          }
        });
      }
      // Update unread counts
      const chatIndex = state.chats.findIndex((c) => c.id === chatId);
      if (chatIndex !== -1) {
        state.chats[chatIndex].homeownerUnreadCount = 0;
        state.chats[chatIndex].contractorUnreadCount = 0;
      }
      if (state.currentChat?.id === chatId) {
        state.currentChat.homeownerUnreadCount = 0;
        state.currentChat.contractorUnreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch user chats
    builder
      .addCase(fetchUserChats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserChats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
        state.error = null;
      })
      .addCase(fetchUserChats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch chat by ID
    builder
      .addCase(fetchChatById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChatById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentChat = action.payload;
        // Update in list if exists
        const index = state.chats.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.chats[index] = action.payload;
        } else {
          state.chats.push(action.payload);
        }
        state.error = null;
      })
      .addCase(fetchChatById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch chat messages
    builder
      .addCase(fetchChatMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages[action.payload.chatId] = action.payload.messages;
        state.error = null;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        const { chatId, message } = action.payload;
        if (!state.messages[chatId]) {
          state.messages[chatId] = [];
        }
        // Prevent duplicate messages by checking if message ID already exists
        const existingIndex = state.messages[chatId].findIndex((m) => m.id === message.id);
        if (existingIndex === -1) {
          state.messages[chatId].push(message);
        }
        // Update chat's last message
        const chatIndex = state.chats.findIndex((c) => c.id === chatId);
        if (chatIndex !== -1) {
          state.chats[chatIndex].lastMessage = message.content;
          state.chats[chatIndex].lastMessageAt = message.createdAt;
        }
        if (state.currentChat?.id === chatId) {
          state.currentChat.lastMessage = message.content;
          state.currentChat.lastMessageAt = message.createdAt;
        }
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Mark messages as read
    builder
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        const { chatId, currentUserId } = action.payload;
        // Only mark messages from other users as read
        if (state.messages[chatId] && currentUserId) {
          state.messages[chatId].forEach((msg) => {
            if (msg.senderId !== currentUserId && !msg.isRead) {
              msg.isRead = true;
            }
          });
        }
        // Update unread counts
        const chatIndex = state.chats.findIndex((c) => c.id === chatId);
        if (chatIndex !== -1) {
          state.chats[chatIndex].homeownerUnreadCount = 0;
          state.chats[chatIndex].contractorUnreadCount = 0;
        }
        if (state.currentChat?.id === chatId) {
          state.currentChat.homeownerUnreadCount = 0;
          state.currentChat.contractorUnreadCount = 0;
        }
      });

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const { clearError, setCurrentChat, addMessage, clearMessages, markMessagesAsReadInChat } = chatSlice.actions;
export default chatSlice.reducer;

