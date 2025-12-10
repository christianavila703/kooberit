import { Request, Response } from 'express';
import jobPostService from '@/services/jobPostService';
import userService from '@/services/userService';
import contractorContactService from '@/services/contractorContactService';
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

    let { radius = 0, categories, search, page, limit, province } = req.query;
    if (!categories) {
      categories = req.query['categories[]'];
    }
    let cities = req.query['cities[]'];
    if (!cities) {
      cities = req.query.cities;
    }

    const radiusKm = Number(radius) || 0;
    const categoryFilters = categories
      ? (Array.isArray(categories) ? categories : [categories]).map((c) => String(c))
      : undefined;
    const cityFilters = cities
      ? (Array.isArray(cities) ? cities : [cities]).map((c) => String(c).trim()).filter((c) => c.length > 0)
      : undefined;
    const provinceFilter = province ? String(province) : 'ON'; // Default to ON
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    // Use categories sent from frontend (frontend is responsible for including contractor's profile categories)
    const { data, pagination } = await jobPostService.findJobPostsWithinRadius(
      latitude,
      longitude,
      radiusKm,
      categoryFilters,
      user.id,
      pageNum,
      limitNum,
      cityFilters,
      provinceFilter
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

    // Check contact status for each job post
    const jobPostsWithContactStatus = await Promise.all(
      filteredPosts.map(async (post) => {
        const postId = (post as any).id || (post as any)._id?.toString() || '';
        const contact = await contractorContactService.findContractorContactByJobPostAndContractor(
          postId,
          user.id
        );
        
        return {
          ...post,
          hasContacted: !!contact,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Job posts retrieved successfully',
      data: {
        jobPosts: jobPostsWithContactStatus,
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

