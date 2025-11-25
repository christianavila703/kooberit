import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchChatById,
  fetchChatMessages,
  sendMessage,
  markMessagesAsRead,
  addMessage,
  markMessagesAsReadInChat,
} from '@/store/slices/chatSlice';
import socketService from '@/services/socket';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentChat, messages, isLoading } = useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    if (chatId) {
      loadChat();
      loadMessages();
      connectSocket();
    }

    return () => {
      const chatId = Array.isArray(id) ? id[0] : id;
      if (chatId) {
        socketService.leaveChat(chatId);
      }
      socketService.off('new_message');
      socketService.off('user_typing');
      socketService.off('user_stopped_typing');
      socketService.off('messages_read');
    };
  }, [id]);

  const connectSocket = async () => {
    try {
      // Ensure id is a string (handle array case from useLocalSearchParams)
      const chatId = Array.isArray(id) ? id[0] : id;
      await socketService.connect();
      if (chatId && typeof chatId === 'string') {
        socketService.joinChat(chatId);
        
        // Listen for new messages from other users (sender gets message from API response)
        // Socket emits to others only, so all socket messages are from other users
        socketService.on('new_message', (message: any) => {
          // Only add if message matches current chat
          if (message.chatId === chatId) {
            dispatch(addMessage({ chatId: chatId, message }));
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        });

        // Listen for typing indicators
        socketService.on('user_typing', (data: { chatId: string; userId: string }) => {
          if (data.chatId === chatId && data.userId !== user?.id) {
            setPartnerTyping(true);
          }
        });

        socketService.on('user_stopped_typing', (data: { chatId: string; userId: string }) => {
          if (data.chatId === chatId && data.userId !== user?.id) {
            setPartnerTyping(false);
          }
        });

        // Listen for read receipts (when other user marks messages as read)
        socketService.on('messages_read', (data: { chatId: string; userId: string }) => {
          console.log('messages_read', data);
          if (data.chatId === chatId && data.userId !== user?.id) {
            dispatch(markMessagesAsReadInChat({ chatId: chatId, currentUserId: data.userId }));
          }
        });
      }
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  };

  // Mark messages as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const chatId = Array.isArray(id) ? id[0] : id;
      if (!chatId || typeof chatId !== 'string' || !user) return;

      // Get current messages for this chat
      const chatMessages = messages[chatId] || [];
      
      // Only mark as read if there are unread messages from the other person
      const hasUnreadMessages = chatMessages.some(
        (msg) => msg.senderId !== user.id && !msg.isRead
      );

      if (hasUnreadMessages) {
        // Small delay to ensure messages are loaded
        const timer = setTimeout(() => {
          // Mark messages as read via API (Redux will update state automatically)
          dispatch(markMessagesAsRead(chatId));
        }, 300);

        return () => clearTimeout(timer);
      }
    }, [id, messages, user, dispatch])
  );

  useEffect(() => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    // Scroll to bottom when new messages arrive
    if (chatId && messages[chatId] && messages[chatId].length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, id, dispatch]);

  const loadChat = async () => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    if (!chatId || typeof chatId !== 'string') return;
    try {
      await dispatch(fetchChatById(chatId)).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load chat');
      router.back();
    }
  };

  const loadMessages = async () => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    if (!chatId || typeof chatId !== 'string') return;
    try {
      await dispatch(fetchChatMessages({ chatId: chatId })).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    if (!messageText.trim() || !chatId || typeof chatId !== 'string') return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    socketService.stopTyping(chatId);

    try {
      // Send via API (API will broadcast to others via socket)
      await dispatch(
        sendMessage({
          chatId: chatId,
          data: {
            content: text,
            type: 'text',
          },
        })
      ).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to send message');
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        notification.error('Permission Required', 'Please grant camera roll permissions to send images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Ensure id is a string (handle array case from useLocalSearchParams)
        const chatId = Array.isArray(id) ? id[0] : id;
        if (!chatId || typeof chatId !== 'string') return;
        
        // TODO: Upload image to server and get URL
        // For now, use placeholder
        const imageUrl = result.assets[0].uri;
        setSending(true);
        
        try {
          // Send via API (API will broadcast to others via socket)
          await dispatch(
            sendMessage({
              chatId: chatId,
              data: {
                content: 'Image sent',
                type: 'image',
                fileUrl: imageUrl,
              },
            })
          ).unwrap();
        } catch (error: any) {
          notification.error('Error', 'Failed to send image');
        } finally {
          setSending(false);
        }
      }
    } catch (error: any) {
      notification.error('Error', 'Failed to pick image');
    }
  };

  const handleTextChange = (text: string) => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = Array.isArray(id) ? id[0] : id;
    if (!chatId || typeof chatId !== 'string') return;
    
    setMessageText(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(chatId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(chatId);
    }, 2000);
  };

  const getChatPartner = () => {
    if (!currentChat) return null;
    if (user?.role === 'homeowner') {
      return currentChat.contractor;
    }
    return currentChat.homeowner;
  };

  // Ensure id is a string (handle array case from useLocalSearchParams)
  const chatId = Array.isArray(id) ? id[0] : id;
  const chatMessages = (chatId && typeof chatId === 'string') ? messages[chatId] || [] : [];
  const partner = getChatPartner();
  const isDark = colorScheme === 'dark';

  // Set header title based on chat partner
  useLayoutEffect(() => {
    if (partner) {
      const partnerName = partner.firstName && partner.lastName
        ? `${partner.firstName} ${partner.lastName}`
        : partner.firstName || partner.lastName || 'Chat';
      navigation.setOptions({
        title: partnerName,
      });
    } else {
      navigation.setOptions({
        title: 'Chat',
      });
    }
  }, [partner, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Homeowner Info Section (for contractors) */}
      {user?.role === 'contractor' && currentChat?.homeowner && (
        <View style={[styles.infoSection, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <View style={styles.infoContent}>
            <View style={styles.infoHeader}>
              <IconSymbol name="person.fill" size={20} color={colors.tint} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Homeowner</Text>
            </View>
            <Text style={[styles.infoName, { color: colors.text }]}>
              {currentChat.homeowner.firstName} {currentChat.homeowner.lastName}
            </Text>
            <Text style={[styles.infoEmail, { color: colors.icon }]}>
              {currentChat.homeowner.email}
            </Text>
          </View>
          {currentChat.jobPostId && (
            <TouchableOpacity
              style={[styles.jobButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push(`/job-post/${currentChat.jobPostId}` as any)}>
              <IconSymbol name="briefcase.fill" size={16} color="#FFFFFF" />
              <Text style={styles.jobButtonText}>View Job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Messages */}
      {isLoading && chatMessages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={() => {}}
          onScroll={(event) => {
            // Mark messages as read when user scrolls near the bottom
            const chatId = Array.isArray(id) ? id[0] : id;
            if (!chatId || typeof chatId !== 'string' || !user) return;

            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const paddingToBottom = 100; // Distance from bottom to trigger read
            
            // Check if user is near the bottom of the list
            const isNearBottom = 
              layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

            if (isNearBottom && chatMessages.length > 0) {
              // Only mark as read if there are unread messages from the other person
              const hasUnreadMessages = chatMessages.some(
                (msg) => msg.senderId !== user.id && !msg.isRead
              );
              
              if (hasUnreadMessages) {
                // Mark messages as read via API (Redux will update state automatically)
                dispatch(markMessagesAsRead(chatId));
              }
            }
          }}
          scrollEventThrottle={400}
          renderItem={({ item }) => {
            const isOwnMessage = item.senderId === user?.id;
            return (
              <View
                style={[
                  styles.messageContainer,
                  isOwnMessage ? styles.ownMessage : styles.otherMessage,
                ]}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isOwnMessage ? colors.tint : isDark ? '#1E1E1E' : '#F5F5F5',
                      alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                    },
                  ]}>
                  {item.type === 'image' && item.fileUrl ? (
                    <View style={styles.imageContainer}>
                      <Text style={[styles.imageText, { color: isOwnMessage ? '#FFFFFF' : colors.text }]}>
                        📷 Image
                      </Text>
                      <Text style={[styles.imageUrl, { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.icon }]} numberOfLines={1}>
                        {item.fileUrl}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isOwnMessage ? '#FFFFFF' : colors.text },
                      ]}>
                      {item.content}
                    </Text>
                  )}
                  <View style={styles.messageFooter}>
                    {item.createdAt && (
                      <Text
                        style={[
                          styles.messageTime,
                          { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.icon },
                        ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                    {isOwnMessage && (
                      <Text
                        style={[
                          styles.readIndicator,
                          { color: item.isRead ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' },
                        ]}>
                        {item.isRead ? '✓✓' : '✓'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messagesContent}
          inverted={false}
        />
      )}

      {/* Typing Indicator */}
      {partnerTyping && (
        <View style={styles.typingContainer}>
          <Text style={[styles.typingText, { color: colors.icon }]}>
            {partner?.firstName} is typing...
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
        <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={colors.icon}
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              maxLength={5000}
              editable={!sending}
            />
            {/* <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickImage}
              disabled={sending}>
              <IconSymbol name="photo" size={20} color={colors.icon} />
            </TouchableOpacity> */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.tint },
            (!messageText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}>
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  readIndicator: {
    fontSize: 12,
  },
  imageContainer: {
    marginBottom: 4,
  },
  imageText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  imageUrl: {
    fontSize: 11,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  attachButton: {
    padding: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoContent: {
    flex: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoEmail: {
    fontSize: 13,
  },
  jobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  jobButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

