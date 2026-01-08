import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import chatService from '@/services/chat';
import type {
  IChat,
  IMessage,
  ISendMessageRequest,
  IMode
} from '@/types';

interface IChatState {
  contractor: {
    chats: IChat[];
    messages: { [chatId: string]: IMessage[] };
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
  };
  homeowner: {
    chats: IChat[];
    messages: { [chatId: string]: IMessage[] };
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
  };
}

const initialState: IChatState = {
  contractor: {
    chats: [],
    messages: {},
    unreadCount: 0,
    isLoading: false,
    error: null,
  },
  homeowner: {
    chats: [],
    messages: {},
    unreadCount: 0,
    isLoading: false,
    error: null,
  }
};

/**
 * Fetch user chats
 */
export const fetchUserChats = createAsyncThunk(
  'chat/fetchUserChats',
  async (mode: IMode, { rejectWithValue }) => {
    try {
      const chats = await chatService.getUserChats(mode);
      return { mode, chats };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to fetch chats' });
    }
  }
);

/**
 * Fetch chat by ID
 */
export const fetchChatById = createAsyncThunk(
  'chat/fetchById',
  async ({ id, mode }: { id: string; mode: IMode }, { rejectWithValue }) => {
    try {
      const chat = await chatService.getChatById(id);
      return { mode, chat };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to fetch chat' });
    }
  }
);

/**
 * Fetch chat messages
 */
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ chatId, mode, limit, before }: { chatId: string; mode: IMode; limit?: number; before?: string }, { rejectWithValue }) => {
    try {
      const messages = await chatService.getChatMessages(chatId, limit, before);
      return { mode, chatId, messages };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to fetch messages' });
    }
  }
);

/**
 * Send message
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, mode, data }: { chatId: string; mode: IMode; data: ISendMessageRequest }, { rejectWithValue }) => {
    try {
      const message = await chatService.sendMessage(chatId, data);
      return { mode, chatId, message };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to send message' });
    }
  }
);

/**
 * Mark messages as read
 */
export const markMessagesAsRead = createAsyncThunk(
  'chat/markAsRead',
  async ({ chatId, mode }: { chatId: string; mode: IMode }, { rejectWithValue, getState }) => {
    try {
      await chatService.markMessagesAsRead(chatId);
      // Get current user ID from auth state
      const state = getState() as any;
      const currentUserId = state.auth?.user?.id;
      return { mode, chatId, currentUserId };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to mark messages as read' });
    }
  }
);

/**
 * Fetch unread count
 */
export const fetchUnreadCount = createAsyncThunk(
  'chat/fetchUnreadCount',
  async (mode: IMode, { rejectWithValue }) => {
    try {
      const count = await chatService.getUnreadCount(mode);
      return { mode, count };
    } catch (error: any) {
      return rejectWithValue({ mode, error: error.message || 'Failed to fetch unread count' });
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state, action: PayloadAction<IMode>) => {
      const mode = action.payload;
      state[mode].error = null;
    },
    addMessage: (state, action: PayloadAction<{ mode: IMode; chatId: string; message: IMessage }>) => {
      const { mode, chatId, message } = action.payload;
      if (!state[mode].messages[chatId]) {
        state[mode].messages[chatId] = [];
      }
      // Prevent duplicate messages by checking if message ID already exists
      const existingIndex = state[mode].messages[chatId].findIndex((m) => m.id === message.id);
      if (existingIndex === -1) {
        state[mode].messages[chatId].push(message);
      }
    },
    clearMessages: (state, action: PayloadAction<{ mode: IMode; chatId: string }>) => {
      const { mode, chatId } = action.payload;
      state[mode].messages[chatId] = [];
    },
    markMessagesAsReadInChat: (state, action: PayloadAction<{ mode: IMode; chatId: string; currentUserId: string }>) => {
      const { mode, chatId, currentUserId } = action.payload;
      const modeState = state[mode];
      // Only mark messages from other users as read
      if (modeState.messages[chatId]) {
        modeState.messages[chatId].forEach((msg) => {
          if (msg.senderId !== currentUserId && !msg.isRead) {
            msg.isRead = true;
          }
        });
      }
      // Update unread counts
      const chatIndex = modeState.chats.findIndex((c) => c.id === chatId);
      if (chatIndex !== -1) {
        modeState.chats[chatIndex].homeownerUnreadCount = 0;
        modeState.chats[chatIndex].contractorUnreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch user chats
    builder
      .addCase(fetchUserChats.pending, (state, action) => {
        const mode = action.meta.arg;
        state[mode].isLoading = true;
        state[mode].error = null;
      })
      .addCase(fetchUserChats.fulfilled, (state, action) => {
        const { mode, chats } = action.payload;
        state[mode].isLoading = false;
        state[mode].chats = chats;
        state[mode].error = null;
      })
      .addCase(fetchUserChats.rejected, (state, action) => {
        const { mode, error } = action.payload as { mode: IMode; error: string };
        state[mode].isLoading = false;
        state[mode].error = error;
      });

    // Fetch chat by ID
    builder
      .addCase(fetchChatById.pending, (state, action) => {
        const mode = action.meta.arg.mode;
        state[mode].isLoading = true;
        state[mode].error = null;
      })
      .addCase(fetchChatById.fulfilled, (state, action) => {
        const { mode, chat } = action.payload;
        state[mode].isLoading = false;
        // Update in list if exists
        const index = state[mode].chats.findIndex((c) => c.id === chat.id);
        if (index !== -1) {
          state[mode].chats[index] = chat;
        } else {
          state[mode].chats.push(chat);
        }
        state[mode].error = null;
      })
      .addCase(fetchChatById.rejected, (state, action) => {
        const { mode, error } = action.payload as { mode: IMode; error: string };
        state[mode].isLoading = false;
        state[mode].error = error;
      });

    // Fetch chat messages
    builder
      .addCase(fetchChatMessages.pending, (state, action) => {
        const mode = action.meta.arg.mode;
        state[mode].isLoading = true;
        state[mode].error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        const { mode, chatId, messages } = action.payload;
        state[mode].isLoading = false;
        state[mode].messages[chatId] = messages;
        state[mode].error = null;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        const { mode, error } = action.payload as { mode: IMode; error: string };
        state[mode].isLoading = false;
        state[mode].error = error;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state, action) => {
        const mode = action.meta.arg.mode;
        state[mode].isLoading = true;
        state[mode].error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { mode, chatId, message } = action.payload;
        const modeState = state[mode];
        modeState.isLoading = false;
        if (!modeState.messages[chatId]) {
          modeState.messages[chatId] = [];
        }
        // Prevent duplicate messages by checking if message ID already exists
        const existingIndex = modeState.messages[chatId].findIndex((m) => m.id === message.id);
        if (existingIndex === -1) {
          modeState.messages[chatId].push(message);
        }
        // Update chat's last message
        const chatIndex = modeState.chats.findIndex((c) => c.id === chatId);
        if (chatIndex !== -1) {
          modeState.chats[chatIndex].lastMessage = message.content;
          modeState.chats[chatIndex].lastMessageAt = message.createdAt;
        }
        modeState.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const { mode, error } = action.payload as { mode: IMode; error: string };
        state[mode].isLoading = false;
        state[mode].error = error;
      });

    // Mark messages as read
    builder
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        const { mode, chatId, currentUserId } = action.payload;
        const modeState = state[mode];
        // Only mark messages from other users as read
        if (modeState.messages[chatId] && currentUserId) {
          modeState.messages[chatId].forEach((msg) => {
            if (msg.senderId !== currentUserId && !msg.isRead) {
              msg.isRead = true;
            }
          });
        }
        // Update unread counts
        const chatIndex = modeState.chats.findIndex((c) => c.id === chatId);
        if (chatIndex !== -1) {
          modeState.chats[chatIndex].homeownerUnreadCount = 0;
          modeState.chats[chatIndex].contractorUnreadCount = 0;
        }
      });

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        const { mode, count } = action.payload;
        state[mode].unreadCount = count;
      });
  },
});

export const { clearError, addMessage, clearMessages, markMessagesAsReadInChat } = chatSlice.actions;
export default chatSlice.reducer;

