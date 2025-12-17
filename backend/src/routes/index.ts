import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import jobPostRoutes from './jobPostRoutes';
import contactRoutes from './contactRoutes';
import contractorRoutes from './contractorRoutes';
import profileRoutes from './profileRoutes';
import chatRoutes from './chatRoutes';
import uploadRoutes from './uploadRoutes';
import paymentRoutes from './paymentRoutes';
import { isAuthenticated } from '@/middlewares/auth';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', isAuthenticated, userRoutes);

// Job post routes
router.use('/job-posts', isAuthenticated, jobPostRoutes);

// Contact routes
router.use('/contacts', isAuthenticated, contactRoutes);

// Contractor routes
router.use('/contractor', isAuthenticated, contractorRoutes);

// Profile routes (settings for both contractor and homeowner)
router.use('/profile', isAuthenticated, profileRoutes);

// Chat routes
router.use('/chats', isAuthenticated, chatRoutes);

// Upload routes
router.use('/upload', isAuthenticated, uploadRoutes);

// Payment routes
router.use('/payments', isAuthenticated, paymentRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

export default router;

