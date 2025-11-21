import { Request, Response } from 'express';
import jobPostService from '@/services/jobPostService';
import logger from '@/utils/logger';

/**
 * Create a new job post
 */
export const createJobPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can create job posts',
      });
    }

    // Convert coordinates to GeoJSON format
    const locationData = {
      ...req.body.location,
      coordinates: {
        type: 'Point',
        coordinates: [
          req.body.location.coordinates.longitude,
          req.body.location.coordinates.latitude,
        ],
      },
    };

    const jobPostData = {
      ...req.body,
      homeownerId: user.id,
      location: locationData,
    };

    const jobPost = await jobPostService.createJobPost(jobPostData);

    logger.info(`Job post created: ${jobPost._id} by homeowner: ${user.id}`);

    // Send notifications to contractors within radius
    try {
      const { User } = await import('@/models');
      const emailService = (await import('@/services/emailService')).default;
      
      // Find contractors with notifications enabled within radius
      const contractors = await User.find({
        role: 'contractor',
        notificationEnabled: true,
        'contractorAddress.coordinates': { $exists: true },
      }).exec();

      // Calculate distance and send notifications
      for (const contractor of contractors) {
        if (!contractor.contractorAddress?.coordinates) continue;

        const contractorLat = contractor.contractorAddress.coordinates.latitude;
        const contractorLng = contractor.contractorAddress.coordinates.longitude;
        // Extract coordinates from GeoJSON format
        const jobCoords = jobPost.location.coordinates as any;
        const jobLat = jobCoords.coordinates ? jobCoords.coordinates[1] : jobCoords.latitude;
        const jobLng = jobCoords.coordinates ? jobCoords.coordinates[0] : jobCoords.longitude;

        // Calculate distance (Haversine formula)
        const R = 6371; // Earth's radius in km
        const dLat = (jobLat - contractorLat) * Math.PI / 180;
        const dLng = (jobLng - contractorLng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(contractorLat * Math.PI / 180) *
          Math.cos(jobLat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const notificationRadius = contractor.notificationRadius || 50;
        if (distance <= notificationRadius) {
          // Check if categories match (if contractor has category preferences, implement here)
          try {
            await emailService.sendNewJobPostNotification(
              contractor.email,
              `${contractor.firstName} ${contractor.lastName}`,
              jobPost.description,
              jobPost.categories,
              distance
            );
          } catch (emailError) {
            logger.error('Failed to send notification email:', emailError);
          }
        }
      }
    } catch (notificationError) {
      logger.error('Error sending job post notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    return res.status(201).json({
      success: true,
      message: 'Job post created successfully',
      data: jobPost,
    });
  } catch (error: any) {
    logger.error('Create job post error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all job posts for homeowner
 */
export const getHomeownerJobPosts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can view their job posts',
      });
    }

    const status = req.query.status as 'active' | 'closed' | undefined;
    const jobPosts = await jobPostService.findJobPostsByHomeowner(user.id, status);

    return res.status(200).json({
      success: true,
      message: 'Job posts retrieved successfully',
      data: jobPosts,
    });
  } catch (error: any) {
    logger.error('Get homeowner job posts error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get job post by ID
 */
export const getJobPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobPost = await jobPostService.findJobPostById(id);

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job post retrieved successfully',
      data: jobPost,
    });
  } catch (error: any) {
    logger.error('Get job post error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update job post
 */
export const updateJobPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can update job posts',
      });
    }

    const jobPost = await jobPostService.updateJobPost(id, user.id, req.body);

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    logger.info(`Job post updated: ${id} by homeowner: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Job post updated successfully',
      data: jobPost,
    });
  } catch (error: any) {
    logger.error('Update job post error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Close job post
 */
export const closeJobPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can close job posts',
      });
    }

    const jobPost = await jobPostService.closeJobPost(id, user.id);

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    logger.info(`Job post closed: ${id} by homeowner: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Job post closed successfully',
      data: jobPost,
    });
  } catch (error: any) {
    logger.error('Close job post error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete job post
 */
export const deleteJobPost = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.role !== 'homeowner') {
      return res.status(403).json({
        success: false,
        message: 'Only homeowners can delete job posts',
      });
    }

    const deleted = await jobPostService.deleteJobPost(id, user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found',
      });
    }

    logger.info(`Job post deleted: ${id} by homeowner: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Job post deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete job post error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

