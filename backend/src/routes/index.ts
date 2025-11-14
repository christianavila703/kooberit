import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import { isAuthenticated } from '@/middlewares/auth';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', isAuthenticated, userRoutes);

export default router;

