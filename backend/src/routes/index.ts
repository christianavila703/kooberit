import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import jobPostRoutes from './jobPostRoutes';
import contractorContactRoutes from './contractorContactRoutes';
import contractorRoutes from './contractorRoutes';
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

// Contractor contact routes
router.use('/contractor-contacts', isAuthenticated, contractorContactRoutes);

// Contractor routes
router.use('/contractor', isAuthenticated, contractorRoutes);

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

