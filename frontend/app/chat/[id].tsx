import React, { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
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
  BackHandler
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
import * as DocumentPicker from 'expo-document-picker';
import chatService from '@/services/chat';
import fileDownloadService from '@/services/fileDownload';
import bidService from '@/services/bid';
import { formatDateSeparator } from '@/utils/helper';
import ProjectMilestoneActions from '@/components/project/ProjectMilestoneActions';

export default function ChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user, mode } = useAppSelector((state) => state.auth);
  const { chats, messages, isLoading } = useAppSelector((state) => state.chat[mode]);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const isNavigatingToMessagesRef = useRef(false);
  const hasCheckedBidRef = useRef(false);
  const systemRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Bid status state
  const [existingBid, setExistingBid] = useState<any>(null);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [initialMilestoneAction, setInitialMilestoneAction] = useState<'date_extension' | 'budget_change' | 'completion' | null>(null);

  const isContractor = user?.role === 'contractor' && mode === 'contractor';

  // Ensure id is a string (ha  ndle array case from useLocalSearchParams)
  const chatId = id;
  const currentChat = useMemo(() => chats.find((chat: any) => chat.id === chatId), [chats, chatId]);
  const chatMessages = useMemo(() => (chatId && typeof chatId === 'string' && messages[chatId]) ? messages[chatId] : [], [messages, chatId]);
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    connectSocket();
    
    return () => {
      const chatId = id;
      if (chatId) {
        socketService.leaveChat(chatId);
      }
      socketService.off('new_message');
      socketService.off('user_typing');
      socketService.off('user_stopped_typing');
      socketService.off('messages_read');
    };
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      loadChat();
      loadMessages();

      hasCheckedBidRef.current = false;
    }, [id])
  )
  
  useEffect(() => {
    if (currentChat && !hasCheckedBidRef.current) {
      hasCheckedBidRef.current = true;
      checkExistingBid();
    }
  }, [currentChat]);

  const checkExistingBid = async () => {
    if (!chatId || !currentChat || !currentChat.contractor) return;
    try {
      console.log('chatId', chatId);
      const bids = await bidService.getBidsByChat(chatId);
      let myBid = null;
      if (isContractor) {
        myBid = bids.find((bid: any) => bid.contractorId === user?.id);
      } else {
        myBid = bids.find((bid: any) => bid.contractorId === currentChat?.contractor?.id);
      }
      setExistingBid(myBid || null);
      if (myBid && myBid.bidStatus === 'awarded' && myBid.awardFeeStatus !== 'completed') {
        setCanSendMessage(false);
      } else {
        setCanSendMessage(true);
      }
    } catch (error: any) {
      // Silently fail - bid might not exist
    }
  };

  const handleSystemPromptAction = (action: 'date_extension' | 'budget_change' | 'completion') => {
    setInitialMilestoneAction(action);
  };

  const connectSocket = async () => {
    try {
      // Ensure id is a string (handle array case from useLocalSearchParams)
      const chatId = id;
      await socketService.connect();
      if (chatId && typeof chatId === 'string') {
        socketService.joinChat(chatId);
        
        // Listen for new messages from other users (sender gets message from API response)
        // Socket emits to others only, so all socket messages are from other users
        socketService.on('new_message', (message: any) => {
          // Only add if message matches current chat
          if (message.chatId === chatId) {
            dispatch(addMessage({ mode, chatId: chatId, message }));

            // System messages often imply server-side state changes (award fee paid, extensions, completion, etc)
            if (message?.type === 'system') {
              if (systemRefreshTimeoutRef.current) {
                clearTimeout(systemRefreshTimeoutRef.current);
              }
              systemRefreshTimeoutRef.current = setTimeout(() => {
                checkExistingBid();
                dispatch(fetchChatById({ id: chatId, mode }));
              }, 250);
            }

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
          if (data.chatId === chatId && data.userId !== user?.id) {
            dispatch(markMessagesAsReadInChat({ mode, chatId: chatId, currentUserId: data.userId }));
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
      const chatId = id;
      if (!chatId || typeof chatId !== 'string' || !user) return;

      // Get current messages for this chat
      const chatMessages = messages[chatId] || [];
      
      // Only mark as read if there are unread messages from the other person
      const hasUnreadMessages = chatMessages.some(
        (msg: any) => msg.senderId !== user?.id && !msg.isRead
      );

      if (hasUnreadMessages) {
        // Small delay to ensure messages are loaded
        const timer = setTimeout(() => {
          // Mark messages as read via API (Redux will update state automatically)
          dispatch(markMessagesAsRead({ chatId, mode }));
        }, 300);

        return () => clearTimeout(timer);
      }
    }, [id, messages, user, dispatch])
  );

  useEffect(() => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = id;
    // Scroll to bottom when new messages arrive
    if (chatId && messages[chatId] && messages[chatId].length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, id, dispatch]);

  const loadChat = useCallback(async () => {
    const chatId = id;
    try {
      await dispatch(fetchChatById({ id: chatId, mode })).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load chat');
      router.back();
    }
  }, [id, dispatch, router]);

  const loadMessages = useCallback(async () => {
    const chatId = id;
    try {
      await dispatch(fetchChatMessages({ chatId: chatId, mode })).unwrap();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load messages');
    }
  }, [id, dispatch]);

  const handleSendMessage = async () => {

    if (!canSendMessage) {
      notification.error('Error', 'You cannot send messages until the award fee is paid. Please pay the award fee to continue messaging.');
      return;
    }

    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = id;
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
          mode,
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

  const handlePickFile = async () => {
    try {
      // Ensure id is a string (handle array case from useLocalSearchParams)
      const chatId = id;
      if (!chatId || typeof chatId !== 'string') return;

      // Show action sheet to choose between image and document
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSending(true);
        
        try {
          // Upload file to server
          const uploadResult = await chatService.uploadFile(
            file.uri,
            file.name || 'file',
            file.mimeType || 'application/octet-stream'
          );

          // Determine message type based on file mime type
          const isImage = file.mimeType?.startsWith('image/') || false;
          const isVideo = file.mimeType?.startsWith('video/') || false;
          const messageType = isImage ? 'image' : 'file';
          let content = '';
          if (isImage) {
            content = 'Image sent';
          } else if (isVideo) {
            content = `Video: ${file.name || 'video'}`;
          } else {
            content = `File: ${file.name || 'file'}`;
          }

          // Send via API (API will broadcast to others via socket)
          await dispatch(
            sendMessage({
              chatId: chatId,
              mode,
              data: {
                content,
                type: messageType,
                fileUrl: uploadResult.url,
              },
            })
          ).unwrap();
        } catch (error: any) {
          notification.error('Error', error.message || 'Failed to send file');
        } finally {
          setSending(false);
        }
      }
    } catch (error: any) {
      if (error.message !== 'User canceled document picker') {
        notification.error('Error', 'Failed to pick file');
      }
    }
  };

  const handleFilePress = async (message: any) => {
    // console.log(FileSystem.documentDirectory);
    // return;
    if (!message.fileUrl) return;

    const messageId = message.id;
    setDownloadingFiles(prev => new Set(prev).add(messageId));

    try {
      // Extract filename from URL or message content
      const urlParts = message.fileUrl.split('/');
      const urlFilename = urlParts[urlParts.length - 1];
      const filename = message.content.includes(':') 
        ? message.content.split(':')[1].trim() || urlFilename
        : urlFilename;

      // Check if file already exists in registry
      const exists = await fileDownloadService.fileExists(filename);

      if (!exists) {
        // Download the file
        await fileDownloadService.saveToDownloads(message.fileUrl, filename);
        notification.success('Success', 'File downloaded to Kooberit registry');
      }

      await fileDownloadService.sharingFile(filename);
    } catch (error: any) {
      notification.error('Error', 'Failed to download file');
    } finally {
      setDownloadingFiles((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleTextChange = (text: string) => {
    // Ensure id is a string (handle array case from useLocalSearchParams)
    const chatId = id;
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
    // Use mode instead of user?.role to support contractor switching to homeowner mode
    if (!isContractor) {
      return currentChat.contractor;
    }
    return currentChat.homeowner;
  };


  // Check if two dates are on different days
  const isDifferentDay = (date1: Date, date2: Date): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() !== d2.getTime();
  };

  // Prepare messages with date separators (chronologically sorted)
  const prepareMessagesWithDates = () => {
    const chatId = id;
    const chatMessages = (chatId && typeof chatId === 'string') ? messages[chatId] || [] : [];
    
    if (chatMessages.length === 0) return [];
    
    // Sort all messages chronologically by createdAt
    const sortedMessages = [...chatMessages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    
    const items: Array<{ type: 'message' | 'date' | 'system'; data: any }> = [];
    
    // Add messages with date separators (including system messages)
    sortedMessages.forEach((message, index) => {
      // Add date separator before first message or when date changes
      const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
      const shouldShowDate = index === 0 || 
        (message.createdAt && prevMessage?.createdAt && 
          isDifferentDay(new Date(message.createdAt), new Date(prevMessage.createdAt)));
      
      if (shouldShowDate) {
        items.push({
          type: 'date',
          data: {
            date: message.createdAt ? new Date(message.createdAt) : new Date(),
            id: `date-${message.id}-${index}`,
          },
        });
      }
      
      // Add message (system or regular)
      if (message.type === 'system') {
        items.push({
          type: 'system',
          data: message,
        });
      } else {
        items.push({
          type: 'message',
          data: message,
        });
      }
    });
    
    return items;
  };

  const messagesWithDates = prepareMessagesWithDates();
  const partner = getChatPartner();

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

  // Handle default back button (header and Android) to navigate to messages tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Skip if we're already navigating to messages to prevent infinite loops
      if (isNavigatingToMessagesRef.current) {
        return;
      }

      // Only intercept back actions
      const action = e.data.action;
      if (action.type === 'GO_BACK' || action.type === 'POP') {
        isNavigatingToMessagesRef.current = true;
        e.preventDefault();
        
        // Navigate to messages tab
        router.push('/(tabs)/messages' as any);
        
        // Reset flag after navigation completes
        setTimeout(() => {
          isNavigatingToMessagesRef.current = false;
        }, 1000);
      }
    });

    return unsubscribe;
  }, [navigation, router]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isNavigatingToMessagesRef.current) {
        isNavigatingToMessagesRef.current = true;
        router.push('/(tabs)/messages' as any);
        setTimeout(() => {
          isNavigatingToMessagesRef.current = false;
        }, 1000);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Homeowner Info Section (for contractors in contractor mode) */}
      {isContractor && currentChat?.homeowner && (
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
            {currentChat.homeowner.phone && (
              <Text style={[styles.infoPhone, { color: colors.icon }]}>
                {currentChat.homeowner.phone}
              </Text>
            )}
            {/* Job Status Indicator */}
            {currentChat.jobId && (
              <View style={styles.jobStatusContainer}>
                {!currentChat.job ? (
                  <View style={[styles.jobStatusBadge, { backgroundColor: '#F44336' }]}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FFFFFF" />
                    <Text style={styles.jobStatusText}>Job Deleted</Text>
                  </View>
                ) : currentChat.job.status === 'closed' ? (
                  <View style={[styles.jobStatusBadge, { backgroundColor: '#9E9E9E' }]}>
                    <IconSymbol name="lock.fill" size={12} color="#FFFFFF" />
                    <Text style={styles.jobStatusText}>Job Closed</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          {currentChat.jobId && (
            <TouchableOpacity
              style={[
                styles.jobButton,
                { backgroundColor: colors.tint },
                !currentChat.job && styles.jobButtonDisabled,
              ]}
              onPress={() => {
                if (currentChat.job) {
                  router.push(`/job/${currentChat.jobId}` as any);
                }
              }}
              disabled={!currentChat.job}>
              <IconSymbol name="briefcase.fill" size={16} color="#FFFFFF" />
              <Text style={styles.jobButtonText}>View Job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contractor Info Section (for homeowners or contractors in homeowner mode) */}
      {!isContractor && currentChat?.contractor && (
        <View style={[styles.infoSection, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <View style={styles.infoContent}>
            <View style={styles.infoHeader}>
              <IconSymbol name="person.fill" size={20} color={colors.tint} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Contractor</Text>
            </View>
            <Text style={[styles.infoName, { color: colors.text }]}>
              {currentChat.contractor.firstName} {currentChat.contractor.lastName}
            </Text>
            <Text style={[styles.infoEmail, { color: colors.icon }]}>
              {currentChat.contractor.email}
            </Text>
            {currentChat.contractor.phone && (
              <Text style={[styles.infoPhone, { color: colors.icon }]}>
                {currentChat.contractor.phone}
              </Text>
            )}
            {/* Job Status Indicator */}
            {currentChat.jobId && (
              <View style={styles.jobStatusContainer}>
                {!currentChat.job ? (
                  <View style={[styles.jobStatusBadge, { backgroundColor: '#F44336' }]}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FFFFFF" />
                    <Text style={styles.jobStatusText}>Job Deleted</Text>
                  </View>
                ) : currentChat.job.status === 'closed' ? (
                  <View style={[styles.jobStatusBadge, { backgroundColor: '#9E9E9E' }]}>
                    <IconSymbol name="lock.fill" size={12} color="#FFFFFF" />
                    <Text style={styles.jobStatusText}>Job Closed</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          {currentChat.jobId && (
            <TouchableOpacity
              style={[
                styles.jobButton,
                { backgroundColor: colors.tint },
                !currentChat.job && styles.jobButtonDisabled,
              ]}
              onPress={() => {
                if (currentChat.job) {
                  router.push(`/job/${currentChat.jobId}` as any);
                }
              }}
              disabled={!currentChat.job}>
              <IconSymbol name="briefcase.fill" size={16} color="#FFFFFF" />
              <Text style={styles.jobButtonText}>View Job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      

      {/* Project Milestones Section */}
      {currentChat?.jobId && existingBid && existingBid.bidStatus === 'awarded' && (
        <ProjectMilestoneActions
          bid={existingBid}
          role={isContractor ? 'contractor' : 'homeowner'}
          renderMode="card"
          isShow={false}
          isJobCompleted={currentChat?.job?.status === 'completed'}
          initialAction={initialMilestoneAction}
          onInitialActionConsumed={() => setInitialMilestoneAction(null)}
          onBidShouldRefresh={checkExistingBid}
        />
      )}

      {/* Messages */}
      {isLoading && chatMessages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messagesWithDates}
          keyExtractor={(item) => item.data.id || item.data.date?.toString()}
          onScrollToIndexFailed={() => {}}
          onScroll={(event) => {
            // Mark messages as read when user scrolls near the bottom
            const chatId = id;
            if (!chatId || typeof chatId !== 'string' || !user) return;

            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const paddingToBottom = 100; // Distance from bottom to trigger read
            
            // Check if user is near the bottom of the list
            const isNearBottom = 
              layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

            if (isNearBottom && chatMessages.length > 0) {
              // Only mark as read if there are unread messages from the other person
              const hasUnreadMessages = chatMessages.some(
                (msg: any) => msg.senderId !== user.id && !msg.isRead
              );
              
              if (hasUnreadMessages) {
                // Mark messages as read via API (Redux will update state automatically)
                dispatch(markMessagesAsRead({ chatId, mode }));
              }
            }
          }}
          scrollEventThrottle={400}
          renderItem={({ item }) => {
            // Render system message
            if (item.type === 'system') {
              const message = item.data;
              const isExtensionPrompt =
                typeof message.content === 'string' &&
                message.content ===
                  'Would you like to ask the homeowner for an extension on the project due date?';
              const isBudgetPrompt =
                typeof message.content === 'string' &&
                message.content ===
                  'Would you like to ask the homeowner for a change in the value of bid?';
              const isCompletionPrompt =
                typeof message.content === 'string' &&
                (message.content === 'Has the Contractor completed the work by the project due date?' ||
                  message.content === 'Has the Contractor completed the work within value of bid?');

              // Detect bid status messages by content patterns
              const isBidStatusMessage = message.content && (
                message.content.startsWith('🎉 Your Bid Has Been Awarded') ||
                message.content.startsWith('Your Bid Was Not Selected') ||
                message.content.startsWith('Your Bid Is Pending') ||
                message.content.startsWith('No Bid Submitted') ||
                message.content.includes('You have awarded this bid')
              );
              
              // Determine bid status from content
              let bidStatus: 'awarded' | 'rejected' | 'pending' | null = null;
              if (isBidStatusMessage) {
                if (message.content.startsWith('🎉 Your Bid Has Been Awarded') || message.content.includes('You have awarded this bid')) {
                  bidStatus = 'awarded';
                } else if (message.content.startsWith('Your Bid Was Not Selected')) {
                  bidStatus = 'rejected';
                } else if (message.content.startsWith('Your Bid Is Pending')) {
                  bidStatus = 'pending';
                }
              }
              
              // Check if we should show pay button (awarded but fee not paid)
              const showPayButton = isBidStatusMessage && 
                bidStatus === 'awarded' && 
                existingBid && 
                existingBid.bidStatus === 'awarded' &&
                existingBid.awardFeeStatus !== 'completed' &&
                ((!existingBid.passFeeToHomeowner && message.content.includes('Please pay the award fee'))
                  || (existingBid.passFeeToHomeowner && message.content.includes('before the project can proceed.')));
              
              const backgroundColor = isBidStatusMessage
                ? bidStatus === 'awarded'
                  ? isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)'
                  : bidStatus === 'rejected'
                  ? isDark ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)'
                  : bidStatus === 'pending'
                  ? isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)'
                  : isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)'
                : isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)';
              
              const borderColor = isBidStatusMessage
                ? bidStatus === 'awarded'
                  ? 'rgba(76, 175, 80, 0.3)'
                  : bidStatus === 'rejected'
                  ? 'rgba(244, 67, 54, 0.3)'
                  : bidStatus === 'pending'
                  ? 'rgba(255, 152, 0, 0.3)'
                  : 'rgba(255, 152, 0, 0.3)'
                : 'rgba(255, 152, 0, 0.3)';
              
              return (
                <View style={styles.systemMessageContainer}>
                  <View style={[styles.systemMessageBubble, { backgroundColor, borderColor }]}>
                    <Text style={[
                      styles.systemMessageText, 
                      { color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)' },
                      showPayButton && { marginBottom: 8 }
                    ]}>
                      {message.content}
                    </Text>
                    {/* Action shortcuts for milestone prompts */}
                    {isContractor && isExtensionPrompt && (
                      <TouchableOpacity
                        style={[styles.payFeeButtonSystem, { backgroundColor: colors.tint }]}
                        onPress={() => handleSystemPromptAction('date_extension')}
                      >
                        <Text style={styles.payFeeButtonSystemText}>Request Extension</Text>
                      </TouchableOpacity>
                    )}
                    {isContractor && isBudgetPrompt && (
                      <TouchableOpacity
                        style={[styles.payFeeButtonSystem, { backgroundColor: colors.tint }]}
                        onPress={() => handleSystemPromptAction('budget_change')}
                      >
                        <Text style={styles.payFeeButtonSystemText}>Request Budget Change</Text>
                      </TouchableOpacity>
                    )}
                    {!isContractor && isCompletionPrompt && (
                      <TouchableOpacity
                        style={[styles.payFeeButtonSystem, { backgroundColor: colors.tint }]}
                        onPress={() => handleSystemPromptAction('completion')}
                      >
                        <Text style={styles.payFeeButtonSystemText}>Answer</Text>
                      </TouchableOpacity>
                    )}
                    {showPayButton && existingBid && (
                      <TouchableOpacity
                        style={[styles.payFeeButtonSystem, { backgroundColor: colors.tint }]}
                        onPress={() => router.push(`/payment/award-fee/${existingBid.id}` as any)}>
                        <Text style={styles.payFeeButtonSystemText}>
                          Pay Award Fee (${existingBid.awardFee.toFixed(2)})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }
            
            // Render date separator
            if (item.type === 'date') {
              return (
                <View style={styles.dateSeparatorContainer}>
                  <View style={[styles.dateSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                    <Text style={[styles.dateSeparatorText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                      {formatDateSeparator(item.data.date)}
                    </Text>
                  </View>
                </View>
              );
            }
            
            // Render message
            const message = item.data;
            const isOwnMessage = message.senderId === user?.id;
            return (
              <View
                style={[
                  styles.messageContainer,
                  isOwnMessage ? styles.ownMessage : styles.otherMessage
                ]}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isOwnMessage ? colors.tint : isDark ? '#1E1E1E' : '#F5F5F5',
                      alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                    },
                    (message.type === 'file' || message.type === 'image') && styles.fileBubble,
                  ]}>
                  {(message.type === 'image' || message.type === 'file') && message.fileUrl ? (
                    <TouchableOpacity
                      style={styles.fileContainer}
                      onPress={() => handleFilePress(message)}
                      disabled={downloadingFiles.has(message.id)}>
                      <View style={styles.fileInfo}>
                        {downloadingFiles.has(message.id) ? (
                          <ActivityIndicator size="small" color={isOwnMessage ? '#FFFFFF' : colors.tint} />
                        ) : (
                          <IconSymbol 
                            name={message.type === 'image' ? 'photo' : 'doc'} 
                            size={20} 
                            color={isOwnMessage ? '#FFFFFF' : colors.tint} 
                          />
                        )}
                        <View style={styles.fileDetails}>
                          <Text style={[styles.fileName, { color: isOwnMessage ? '#FFFFFF' : colors.text }]}>
                            {message.type === 'image' 
                              ? 'Image' 
                              : message.content.replace('File: ', '').replace('Video: ', '')}
                          </Text>
                          <Text style={[styles.fileUrl, { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.icon }]} numberOfLines={1}>
                            {downloadingFiles.has(message.id) ? 'Downloading...' : 'Tap to download'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isOwnMessage ? '#FFFFFF' : colors.text },
                      ]}>
                      {message.content}
                    </Text>
                  )}
                  <View style={styles.messageFooter}>
                    {message.createdAt && (
                      <Text
                        style={[
                          styles.messageTime,
                          { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.icon },
                        ]}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                    {isOwnMessage && (
                      <Text
                        style={[
                          styles.readIndicator,
                          { color: message.isRead ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' },
                        ]}>
                        {message.isRead ? '✓✓' : '✓'}
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
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickFile}
          disabled={sending}>
          <IconSymbol name="paperclip" size={20} color={colors.icon} />
        </TouchableOpacity>
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
          style={[
            styles.sendButton,
            { backgroundColor: colors.tint },
            (!messageText.trim() || sending || !canSendMessage) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending || !canSendMessage}>
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Message Restriction Warning for Contractors */}
      {!canSendMessage && existingBid && (
        <View style={[styles.restrictionBanner, { backgroundColor: '#FF3B30' }]}>
          <IconSymbol name="lock.fill" size={20} color="#FFFFFF" />
          <View style={styles.restrictionTextContainer}>
            <Text style={styles.restrictionText}>
              You cannot send messages until the award fee is paid
            </Text>
          </View>
        </View>
      )}

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
  fileBubble: {
    width: 200
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
  fileContainer: {
    marginBottom: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileUrl: {
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  jobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  jobButtonDisabled: {
    opacity: 0.5,
  },
  jobButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  jobStatusContainer: {
    marginTop: 8,
  },
  jobStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  jobStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  dateSeparatorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  systemMessageBubble: {
    maxWidth: '90%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  systemMessageText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '400',
  },
  payFeeButtonSystem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  payFeeButtonSystemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bidButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bidStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  bidStatusText: {
    flex: 1,
    fontSize: 14,
  },
  payAwardFeeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payAwardFeeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    padding: 24,
    marginBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalContent: {
    
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  awardFeePreview: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dateInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
  },
  dateHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxHint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
    fontStyle: 'italic',
  },
  warningTextSmall: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
  },
  restrictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  restrictionTextContainer: {
    flex: 1,
  },
  restrictionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  payFeeButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  payFeeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  bidStatusBanner: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  bidStatusBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bidStatusBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  bidStatusBannerText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  payFeeButtonBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  payFeeButtonBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewJobButtonBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  viewJobButtonBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

