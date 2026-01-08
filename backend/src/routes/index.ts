import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import contactRoutes from './contactRoutes';
import profileRoutes from './profileRoutes';
import chatRoutes from './chatRoutes';
import uploadRoutes from './uploadRoutes';
import paymentRoutes from './paymentRoutes';
import jobRoutes from './jobRoutes';
import invitationRoutes from './invitationRoutes';
import bidRoutes from './bidRoutes';

import { isAuthenticated } from '@/middlewares/auth';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', isAuthenticated, userRoutes);

// Job routes
router.use('/jobs', isAuthenticated, jobRoutes);

// Contact routes
router.use('/contacts', isAuthenticated, contactRoutes);

// Profile routes (settings for both contractor and homeowner)
router.use('/profile', isAuthenticated, profileRoutes);

// Chat routes
router.use('/chats', isAuthenticated, chatRoutes);

// Upload routes
router.use('/upload', isAuthenticated, uploadRoutes);

// Payment routes
router.use('/payments', isAuthenticated, paymentRoutes);

// Invitation routes
router.use('/invitations', invitationRoutes);

// Bid routes
router.use('/bids', isAuthenticated, bidRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

export default router;

