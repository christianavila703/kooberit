import { Request, Response } from 'express';
import authService from '@/services/authService';
import logger from '@/utils/logger';
import { generateToken } from '@/utils/jwt';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
    try {
        const registerData = req.body;
        const result = await authService.register(registerData);

        logger.info(`User registered successfully: ${registerData.email}`);
        
        return res.status(201).json({ 
            success: true, 
            message: 'User registered successfully', 
            data: result
        });
    } catch (error: any) {
        logger.error('Register error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
    try {
        const loginData = req.body;
        const result = await authService.login(loginData);
        
        logger.info(`User logged in successfully: ${loginData.email}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            data: result
        });
    } catch (error: any) {
        logger.error('Login error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

/**
 * Verify token and get user info (for page refresh)
 */
export const refreshToken = async (req: Request, res: Response) => {
    try {
        // User is already attached to req by auth middleware
        const user = (req as any).user;

        const token = generateToken({
            id: user.id,
            email: user.email,
        });

        logger.info(`Token refreshed successfully for user: ${user.email}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Token refreshed successfully', 
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                },
                token: token,
            }
        });
    } catch (error: any) {
        logger.error('Verify token error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { oldPassword, newPassword } = req.body;
        
        await authService.changePassword(user.id, oldPassword, newPassword);

        logger.info(`Password changed successfully for user: ${user.email}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
    } catch (error: any) {
        logger.error('Change password error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        
        const resetToken = await authService.requestPasswordReset(email);
        
        // In production, send email with reset link
        // For now, we'll just return success (email sending would be handled by email service)
        
        logger.info(`Password reset requested for: ${email}`);

        return res.status(200).json({ 
            success: true, 
            message: 'If an account with that email exists, a password reset link has been sent.' 
        });
    } catch (error: any) {
        logger.error('Request password reset error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        
        await authService.resetPassword(token, newPassword);

        logger.info('Password reset successful');

        return res.status(200).json({ 
            success: true, 
            message: 'Password reset successfully' 
        });
    } catch (error: any) {
        logger.error('Reset password error:', error);
        res.status(error.statusCode || 500).json({ 
            success: false,
            message: error.message 
        });
    }
};

