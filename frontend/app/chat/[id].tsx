import React, { useEffect, useState, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchChatById,
  fetchChatMessages,
  sendMessage,
  markMessagesAsRead,
  addMessage,
} from '@/store/slices/chatSlice';
import socketService from '@/services/socket';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { API_CONFIG } from '@/constants/config';
import endpoints from '@/constants/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const router = useRouter();
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
    if (id) {
      loadChat();
      loadMessages();
      connectSocket();
    }

    return () => {
      if (id) {
        socketService.leaveChat(id);
      }
      socketService.off('new_message');
      socketService.off('user_typing');
      socketService.off('user_stopped_typing');
      socketService.off('messages_read');
    };
  }, [id]);

  const connectSocket = async () => {
    try {
      await socketService.connect();
      if (id) {
        socketService.joinChat(id);
        
        // Listen for new messages
        socketService.on('new_message', (message: any) => {
          if (message.chatId === id) {
            dispatch(addMessage({ chatId: id, message }));
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        });

        // Listen for typing indicators
        socketService.on('user_typing', (data: { chatId: string; userId: string }) => {
          if (data.chatId === id && data.userId !== user?.id) {
            setPartnerTyping(true);
          }
        });

        socketService.on('user_stopped_typing', (data: { chatId: string; userId: string }) => {
          if (data.chatId === id && data.userId !== user?.id) {
            setPartnerTyping(false);
          }
        });

        // Listen for read receipts
        socketService.on('messages_read', (data: { chatId: string; userId: string }) => {
          if (data.chatId === id) {
            // Update read status in Redux if needed
          }
        });
      }
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  };

  useEffect(() => {
    if (currentChat && user) {
      // Mark messages as read when chat is opened
      dispatch(markMessagesAsRead(id!));
      socketService.markRead(id!);
    }
  }, [currentChat, user, id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages[id!] && messages[id!].length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, id]);

  const loadChat = async () => {
    try {
      await dispatch(fetchChatById(id!)).unwrap();
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to load chat');
      router.back();
    }
  };

  const loadMessages = async () => {
    try {
      await dispatch(fetchChatMessages({ chatId: id! })).unwrap();
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    socketService.stopTyping(id);

    try {
      // Send via socket for real-time
      socketService.sendMessage(id, text, 'text');
      
      // Also send via API for persistence
      await dispatch(
        sendMessage({
          chatId: id,
          data: {
            content: text,
            type: 'text',
          },
        })
      ).unwrap();
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to send message');
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        notificationService.error('Permission Required', 'Please grant camera roll permissions to send images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload image to server and get URL
        // For now, use placeholder
        const imageUrl = result.assets[0].uri;
        setSending(true);
        
        try {
          socketService.sendMessage(id!, 'Image sent', 'image', imageUrl);
          await dispatch(
            sendMessage({
              chatId: id!,
              data: {
                content: 'Image sent',
                type: 'image',
                fileUrl: imageUrl,
              },
            })
          ).unwrap();
        } catch (error: any) {
          notificationService.error('Error', 'Failed to send image');
        } finally {
          setSending(false);
        }
      }
    } catch (error: any) {
      notificationService.error('Error', 'Failed to pick image');
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(id!);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(id!);
    }, 2000);
  };

  const getChatPartner = () => {
    if (!currentChat) return null;
    if (user?.role === 'homeowner') {
      return currentChat.contractor;
    }
    return currentChat.homeowner;
  };

  const chatMessages = id ? messages[id] || [] : [];
  const partner = getChatPartner();
  const isDark = colorScheme === 'dark';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        {partner && (
          <View style={styles.headerInfo}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.headerAvatarText}>
                {partner.firstName?.[0] || 'U'}
                {partner.lastName?.[0] || ''}
              </Text>
            </View>
            <View>
              <Text style={[styles.headerName, { color: colors.text }]}>
                {partner.firstName} {partner.lastName}
              </Text>
              <Text style={[styles.headerEmail, { color: colors.icon }]}>
                {partner.email}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.backButton} />
      </View>

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
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickImage}
              disabled={sending}>
              <IconSymbol name="photo" size={20} color={colors.icon} />
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerEmail: {
    fontSize: 12,
    marginTop: 2,
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
});

