import { Request, Response } from 'express';
import profileService from '@/services/profileService';
import logger from '@/utils/logger';

/**
 * Get profile settings
 * @route   GET /api/profile/settings
 * @access  Private
 */
export const getProfileSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const settings = await profileService.getSettings(user.id);

    return res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Get profile settings error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update profile settings
 * @route   PUT /api/profile/settings
 * @access  Private
 */
export const updateProfileSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const settings = await profileService.updateSettings(user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Update profile settings error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

