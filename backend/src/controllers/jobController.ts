import { Request, Response } from 'express';
import jobService from '@/services/jobService';
import userService from '@/services/userService';
import invitationService from '@/services/invitationService';
import logger from '@/utils/logger';
import { IJobStatus, IProvince } from '@/types';
import { USER_ROLES } from '@enums';

/**
 * Get all jobs for contractor
 */
export const getContractorJobs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
    
        // Get contractor's location
        const contractorUser = await userService.findUserById(user.id);
        if (!contractorUser || !contractorUser.contractorAddress?.coordinates) {
            return res.status(400).json({
                success: false,
                message: 'Contractor address not set. Please update your address in settings.',
            });
        }
  
        // Validate coordinates are numbers
        const latitude = contractorUser.contractorAddress.coordinates.latitude || null;
        const longitude = contractorUser.contractorAddress.coordinates.longitude || null;
    
        let { status, radius = 0, categories, search, page, limit, province } = req.query;

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
        const { data, pagination } = await jobService.findContractorJobsWithinRadius(
            status as IJobStatus,
            latitude as number,
            longitude as number,
            radiusKm,
            categoryFilters,
            user.id,
            pageNum,
            limitNum,
            cityFilters,
            provinceFilter as IProvince
        );
    
        // Filter by search keyword if provided
        let filteredPosts = data;
        if (search) {
            const searchLower = String(search).toLowerCase();
            filteredPosts = data.filter(
            (post: any) =>
                post.id.toString().includes(searchLower) ||
                post.jobNumber.toString().includes(searchLower) ||
                post.jobTitle.toLowerCase().includes(searchLower) ||
                post.description?.toLowerCase().includes(searchLower) ||
                post.categories?.some((cat: string) => cat.toLowerCase().includes(searchLower))
            );
        }
    
        // Get contractor email for invitation check
        const contractorEmail = contractorUser?.email || '';

        // Check contact status and invitation status for each job post
        const jobsWithContactStatus = await Promise.all(
            filteredPosts.map(async (post) => {
                const postId = (post as any).id || (post as any)._id?.toString() || '';
                const contact = await jobService.findContactByJobAndContractor(
                    postId,
                    user.id
                );
                
                // Check if contractor has been invited to this job
                const hasInvitation = contractorEmail
                    ? await invitationService.checkInvitationByJobAndContractor(
                        postId,
                        contractorEmail
                      )
                    : false;
                
                return {
                    ...post,
                    hasContacted: !!contact,
                    hasInvitation,
                };
            })
        );
    
        return res.status(200).json({
            success: true,
            message: 'Jobs retrieved successfully',
            data: {
                jobs: jobsWithContactStatus,
                pagination: pagination,
            },
        });
    } catch (error: any) {
        logger.error('Get contractor jobs error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get all jobs for homeowner
 */
export const getHomeownerJobs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
    
        const status = req.query.status as IJobStatus;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
    
        const { data, pagination } = await jobService.findJobsByHomeowner(user.id, status, page, limit);

        return res.status(200).json({
            success: true,
            message: 'Jobs retrieved successfully',
            data: {
                jobs: data,
                pagination: pagination,
            },
        });
    } catch (error: any) {
        logger.error('Get homeowner jobs error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Create a new job
 */
export const createJob = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

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
    
        const jobData = {
            ...req.body,
            homeownerId: user.id,
            location: locationData,
        };
    
        const job = await jobService.createJob(jobData);
    
        logger.info(`Job created: ${job._id} by homeowner: ${user.id}`);
    
        return res.status(201).json({
            success: true,
            message: 'Job created successfully',
            data: job,
        });
    } catch (error: any) {
        logger.error('Create job error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};
  
/**
 * Get job by ID
 */
export const getJobById = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const job = await jobService.findJobById(id);
    
        if (!job) {
            return res.status(404).json({
            success: false,
            message: 'Job not found',
            });
        }

        let hasInvitation = false;
        let hasContacted = false;

        if (user.role === USER_ROLES.CONTRACTOR) {
            hasInvitation = await invitationService.checkInvitationByJobAndContractor(
                job.id,
                user.email
            );

            const contact = await jobService.findContactByJobAndContractor(
                job.id,
                user.id
            );

            hasContacted = !!contact;
        }
    
        return res.status(200).json({
            success: true,
            message: 'Job retrieved successfully',
            data: {
                ...job.toObject({ getters: true }),
                hasInvitation: hasInvitation,
                hasContacted: hasContacted,
            },
        });
    } catch (error: any) {
        logger.error('Get job error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};
  
/**
 * Update job
 */
export const updateJob = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
    
        const job = await jobService.updateJob(id, user.id, req.body);
    
        if (!job) {
            return res.status(404).json({
            success: false,
            message: 'Job not found',
            });
        }
    
        logger.info(`Job updated: ${id} by homeowner: ${user.id}`);
    
        return res.status(200).json({
            success: true,
            message: 'Job updated successfully',
            data: job,
        });
    } catch (error: any) {
        logger.error('Update job error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
  };
  
/**
 * Close job
 */
export const closeJob = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
  
      const job = await jobService.closeJob(id, user.id);
  
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }
  
      logger.info(`Job closed: ${id} by homeowner: ${user.id}`);
  
      return res.status(200).json({
        success: true,
        message: 'Job closed successfully',
        data: job,
      });
    } catch (error: any) {
        logger.error('Close job error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};
  
/**
 * Post job to market (change status from pending to open)
 */
export const postJobToMarket = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
    
        const job = await jobService.postJobToMarket(id, user.id);
    
        if (!job) {
            return res.status(404).json({
            success: false,
            message: 'Job not found',
            });
        }
    
        logger.info(`Job posted to market: ${id} by homeowner: ${user.id}`);
    
        return res.status(200).json({
            success: true,
            message: 'Job posted to market successfully',
            data: job,
        });
    } catch (error: any) {
        logger.error('Post job to market error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Delete job
 */
export const deleteJob = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
    
        const deleted = await jobService.deleteJob(id, user.id);
    
        if (!deleted) {
            return res.status(404).json({
            success: false,
            message: 'Job not found',
            });
        }
    
        logger.info(`Job deleted: ${id} by homeowner: ${user.id}`);
    
        return res.status(200).json({
            success: true,
            message: 'Job deleted successfully',
        });
    } catch (error: any) {
        logger.error('Delete job error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};