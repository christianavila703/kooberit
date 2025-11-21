import { Request, Response } from 'express';
import jobPostService from '@/services/jobPostService';
import userService from '@/services/userService';
import logger from '@/utils/logger';

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

    let { radius = 0, categories, search, page, limit } = req.query;
    if (!categories) {
      categories = req.query['categories[]'];
    }

    const radiusKm = Number(radius) || 0;
    const categoryFilters = categories
      ? (Array.isArray(categories) ? categories : [categories]).map((c) => String(c))
      : undefined;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const { data, pagination } = await jobPostService.findJobPostsWithinRadius(
      latitude,
      longitude,
      radiusKm,
      categoryFilters,
      user.id,
      pageNum,
      limitNum
    );

    // Filter by search keyword if provided
    let filteredPosts = data;
    if (search) {
      const searchLower = String(search).toLowerCase();
      filteredPosts = data.filter(
        (post) =>
          post.description.toLowerCase().includes(searchLower) ||
          post.categories.some((cat) => cat.toLowerCase().includes(searchLower))
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Job posts retrieved successfully',
      data: {
        jobPosts: filteredPosts,
        pagination: pagination,
      },
    });
  } catch (error: any) {
    logger.error('Get job board error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

