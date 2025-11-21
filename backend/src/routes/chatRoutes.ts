import { Router } from 'express';
import * as chatController from '@/controllers/chatController';
import { validate } from '@/middlewares/validate';
import { authenticate } from '@/middlewares/auth';
import { sendMessageSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/chats
 * @desc    Get all chats for user
 * @access  Private
 */
router.get('/', authenticate, chatController.getUserChats);

/**
 * @route   GET /api/chats/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', authenticate, chatController.getUnreadCount);

/**
 * @route   GET /api/chats/:id
 * @desc    Get chat by ID
 * @access  Private
 */
router.get('/:id', authenticate, chatController.getChatById);

/**
 * @route   GET /api/chats/:chatId/messages
 * @desc    Get messages for a chat
 * @access  Private
 */
router.get('/:chatId/messages', authenticate, chatController.getChatMessages);

/**
 * @route   POST /api/chats/:chatId/messages
 * @desc    Send a message
 * @access  Private
 */
router.post('/:chatId/messages', authenticate, validate(sendMessageSchema, 'body'), chatController.sendMessage);

/**
 * @route   PATCH /api/chats/:chatId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.patch('/:chatId/read', authenticate, chatController.markMessagesAsRead);

export default router;

