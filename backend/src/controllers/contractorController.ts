import { Request, Response } from 'express';
import jobPostService from '@/services/jobPostService';
import userService from '@/services/userService';
import emailService from '@/services/emailService';
import logger from '@/utils/logger';
import { JobPost } from '@/models';

/**
 * Get job posts for contractor (filtered by radius and categories)
 */
export const getJobBoard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can view job board',
      });
    }

    // Get contractor's location
    const contractor = await userService.findUserById(user.id);
    if (!contractor || !contractor.contractorAddress?.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Contractor address not set. Please update your address in settings.',
      });
    }

    // Validate coordinates are numbers
    const latitude = contractor.contractorAddress.coordinates.latitude || null;
    const longitude = contractor.contractorAddress.coordinates.longitude || null;


    const { radius, categories, search } = req.query;
    const radiusKm = radius ? Number(radius) : contractor.notificationRadius || 50;
    const categoryFilters = categories
      ? (Array.isArray(categories) ? categories : [categories]).map((c) => String(c))
      : undefined;

    const jobPosts = await jobPostService.findJobPostsWithinRadius(
      latitude,
      longitude,
      radiusKm,
      categoryFilters,
      user.id
    );

    // Filter by search keyword if provided
    let filteredPosts = jobPosts;
    if (search) {
      const searchLower = String(search).toLowerCase();
      filteredPosts = jobPosts.filter(
        (post) =>
          post.description.toLowerCase().includes(searchLower) ||
          post.categories.some((cat) => cat.toLowerCase().includes(searchLower))
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Job posts retrieved successfully',
      data: filteredPosts,
    });
  } catch (error: any) {
    logger.error('Get job board error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update contractor settings (address, notifications)
 */
export const updateContractorSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can update contractor settings',
      });
    }

    const { contractorAddress, notificationEnabled, notificationRadius } = req.body;

    const updateData: any = {};
    if (contractorAddress) {
      updateData.contractorAddress = contractorAddress;
    }
    if (notificationEnabled !== undefined) {
      updateData.notificationEnabled = notificationEnabled;
    }
    if (notificationRadius !== undefined) {
      updateData.notificationRadius = notificationRadius;
    }

    const updatedUser = await userService.updateUser(user.id, updateData);

    logger.info(`Contractor settings updated: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        firstName: updatedUser?.firstName,
        lastName: updatedUser?.lastName,
        role: updatedUser?.role,
        contractorAddress: updatedUser?.contractorAddress,
        notificationEnabled: updatedUser?.notificationEnabled,
        notificationRadius: updatedUser?.notificationRadius,
      },
    });
  } catch (error: any) {
    logger.error('Update contractor settings error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get contractor settings
 */
export const getContractorSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'contractor') {
      return res.status(403).json({
        success: false,
        message: 'Only contractors can view contractor settings',
      });
    }

    const contractor = await userService.findUserById(user.id);

    return res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: {
        contractorAddress: contractor?.contractorAddress,
        notificationEnabled: contractor?.notificationEnabled ?? true,
        notificationRadius: contractor?.notificationRadius ?? 50,
      },
    });
  } catch (error: any) {
    logger.error('Get contractor settings error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

