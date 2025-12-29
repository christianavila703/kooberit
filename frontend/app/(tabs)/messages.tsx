import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserChats, fetchUnreadCount } from '@/store/slices/chatSlice';
import { setMode } from '@/store/slices/authSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import socketService from '@/services/socket';
import { statusBarHeight } from '@/constants/resources';
import { IRootState } from '@/store/index';

export default function MessagesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, mode } = useAppSelector((state: IRootState) => state.auth);
  const { chats, unreadCount, isLoading } = useAppSelector((state) => state.chat[mode]);
  const contractorUnreadCount = useAppSelector((state) => state.chat.contractor.unreadCount);
  const homeownerUnreadCount = useAppSelector((state) => state.chat.homeowner.unreadCount);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  
  const isContractor = user?.role === 'contractor' && mode === 'contractor';
  const showToggle = user?.role === 'contractor';
  
  const handleModeChange = (newMode: 'contractor' | 'homeowner') => {
    dispatch(setMode(newMode));
  };
  const loadChats = useCallback(async () => {
    try {
      await dispatch(fetchUserChats(mode)).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load chats');
    }
  }, [dispatch, mode]);

  const loadUnreadCount = useCallback(async () => {
    try {
      await dispatch(fetchUnreadCount(mode)).unwrap();
    } catch (error: any) {
      // Silently fail
    }
  }, [dispatch, mode]);

  // Store handlers in refs so they can be cleaned up properly
  const handlersRef = useRef<{
    handleNewMessage: ((message: any) => void) | null;
    handleMessagesRead: ((data: { chatId: string; userId: string }) => void) | null;
  }>({ handleNewMessage: null, handleMessagesRead: null });

  // Load chats and unread count whenever the screen comes into focus
  // Also set up socket listeners to auto-refresh when events occur
  useFocusEffect(
    React.useCallback(() => {
      loadChats();
      loadUnreadCount();

      // Set up socket connection and listeners
      const setupSocketListeners = async () => {
        try {
          await socketService.connect();
          
          // Verify connection
          if (!socketService.isConnected()) {
            console.warn('Socket not connected after connect() call');
            return;
          }

          // Listen for new messages - refresh chats list when any new message arrives
          const handleNewMessage = (message: any) => {
            console.log('New message received on messages screen:', message);
            // Refresh chats list to update last message and timestamp
            loadChats();
            loadUnreadCount();
          };

          // Listen for messages read events - refresh to update unread counts
          const handleMessagesRead = (data: { chatId: string; userId: string }) => {
            console.log('Messages read event received:', data);
            // Only refresh if it's not the current user who read the messages
            if (data.userId !== user?.id) {
              loadChats();
              loadUnreadCount();
            }
          };

          // Store handlers in ref for cleanup
          handlersRef.current.handleNewMessage = handleNewMessage;
          handlersRef.current.handleMessagesRead = handleMessagesRead;

          socketService.on('new_message', handleNewMessage);
          socketService.on('messages_read', handleMessagesRead);
        } catch (error) {
          console.error('Socket setup error:', error);
        }
      };

      setupSocketListeners();

      // Cleanup on unmount or when screen loses focus
      return () => {
        if (handlersRef.current.handleNewMessage) {
          socketService.off('new_message', handlersRef.current.handleNewMessage);
          handlersRef.current.handleNewMessage = null;
        }
        if (handlersRef.current.handleMessagesRead) {
          socketService.off('messages_read', handlersRef.current.handleMessagesRead);
          handlersRef.current.handleMessagesRead = null;
        }
      };
    }, [isContractor])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadChats(), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}` as any);
  };

  const getChatPartner = (chat: any) => {
    // Use mode instead of user?.role to support contractor switching to homeowner mode
    if (!isContractor) {
      return chat.contractor;
    }
    return chat.homeowner;
  };

  const getUnreadCount = (chat: any) => {
    // Use mode instead of user?.role to support contractor switching to homeowner mode
    if (!isContractor) {
      return chat.homeownerUnreadCount;
    }
    return chat.contractorUnreadCount;
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        </View>
        
        {showToggle && (
          <TabSwitcher
            value={mode}
            onValueChange={handleModeChange}
            colors={colors}
            isDark={isDark}
            contractorUnreadCount={contractorUnreadCount}
            homeownerUnreadCount={homeownerUnreadCount}
          />
        )}
      </View>

      {isLoading && chats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="message" size={64} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No messages yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.icon }]}>
            {!isContractor 
              ? (
                user?.role === 'contractor'
                  ? 'Start a conversation with a Sub-Contractor'
                  : 'Start a conversation with a contractor'
              )
              : 'Start a conversation with a homeowner'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const partner = getChatPartner(item);
            const unread = getUnreadCount(item);
            return (
              <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
                onPress={() => handleChatPress(item.id)}
                activeOpacity={0.7}>
                <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                  <Text style={styles.avatarText}>
                    {partner?.firstName?.[0] || 'U'}
                    {partner?.lastName?.[0] || ''}
                  </Text>
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={[styles.chatName, { color: colors.text }]}>
                      {partner?.firstName} {partner?.lastName}
                    </Text>
                    {item.lastMessageAt && (
                      <Text style={[styles.chatTime, { color: colors.icon }]}>
                        {new Date(item.lastMessageAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.chatFooter}>
                    <Text
                      style={[styles.chatMessage, { color: colors.icon }]}
                      numberOfLines={1}>
                      {item.lastMessage || 'No messages yet'}
                    </Text>
                    {unread > 0 && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.tint }]}>
                        <Text style={styles.unreadDotText}>{unread > 9 ? '9+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: statusBarHeight + 9,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  unreadDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadDotText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

