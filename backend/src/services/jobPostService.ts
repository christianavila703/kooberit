import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { JobPost } from '@/models';
import {
  IJobPostAttributes,
  IJobPostCreationAttributes,
  IJobPostDocument,
} from '@/types';

/**
 * Job Post Service
 */
class JobPostService {
  /**
   * Create a new job post
   */
  async createJobPost(jobPostData: IJobPostCreationAttributes): Promise<IJobPostDocument> {
    // Handle both GeoJSON format and lat/lng format
    let geoJsonCoordinates: [number, number];
    
    if ('coordinates' in jobPostData.location.coordinates && Array.isArray(jobPostData.location.coordinates.coordinates)) {
      // Already in GeoJSON format
      geoJsonCoordinates = jobPostData.location.coordinates.coordinates as [number, number];
    } else if ('latitude' in jobPostData.location.coordinates && 'longitude' in jobPostData.location.coordinates) {
      // Convert from lat/lng to GeoJSON [longitude, latitude]
      geoJsonCoordinates = [
        jobPostData.location.coordinates.longitude,
        jobPostData.location.coordinates.latitude,
      ];
    } else {
      throw new Error('Invalid coordinates format');
    }

    const jobPost = await JobPost.create({
      ...jobPostData,
      homeownerId: new Types.ObjectId(jobPostData.homeownerId),
      contractorContactsCount: 0,
      status: 'active',
      location: {
        address: jobPostData.location.address,
        coordinates: {
          type: 'Point',
          coordinates: geoJsonCoordinates,
        },
      },
    });
    return jobPost;
  }

  /**
   * Find job post by ID
   */
  async findJobPostById(id: string): Promise<IJobPostDocument | null> {
    if (!id) {
      return null;
    }
    return JobPost.findById(id)
      .populate('homeownerId', 'firstName lastName email')
      .exec();
  }

  /**
   * Find all job posts by homeowner
   */
  async findJobPostsByHomeowner(
    homeownerId: string,
    status?: 'active' | 'closed'
  ): Promise<IJobPostDocument[]> {
    const filters: any = { homeownerId: new Types.ObjectId(homeownerId) };
    if (status) {
      filters.status = status;
    }
    return JobPost.find(filters)
      .populate('homeownerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update job post
   */
  async updateJobPost(
    id: string,
    homeownerId: string,
    updateData: Partial<IJobPostCreationAttributes>
  ): Promise<IJobPostDocument | null> {
    const jobPost = await JobPost.findOne({
      _id: id,
      homeownerId: new Types.ObjectId(homeownerId),
    }).exec();

    if (!jobPost) {
      throw new CustomError('Job post not found', 404);
    }

    const updated = await JobPost.findByIdAndUpdate(id, updateData, { new: true })
      .populate('homeownerId', 'firstName lastName email')
      .exec();
    return updated;
  }

  /**
   * Close job post
   */
  async closeJobPost(id: string, homeownerId: string): Promise<IJobPostDocument | null> {
    return this.updateJobPost(id, homeownerId, { status: 'closed' });
  }

  /**
   * Increment contractor contacts count
   */
  async incrementContractorContactsCount(id: string): Promise<void> {
    await JobPost.findByIdAndUpdate(id, { $inc: { contractorContactsCount: 1 } }).exec();
  }

  /**
   * Find job posts within radius (for contractors)
   */
  async findJobPostsWithinRadius(
    latitude: number | null,
    longitude: number | null,
    radiusKm: number,
    categories?: string[],
    excludeContractorId?: string
  ): Promise<IJobPostDocument[]> {
    const radiusInMeters = radiusKm * 1000;

    const filters: any = {
      status: 'active'
    };

    if (latitude && longitude) {
      filters.location.coordinates = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeters,
        },
      };
    }

    if (categories && categories.length > 0) {
      filters.categories = { $in: categories };
    }

    console.log(filters)

    const jobPosts = await JobPost.find(filters)
      .populate('homeownerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();

    // Convert GeoJSON coordinates back to lat/lng format for frontend
    const convertedPosts = jobPosts.map((jobPost) => {
      if (jobPost.location?.coordinates) {
        const coords = jobPost.location.coordinates as any;
        if (coords.coordinates && Array.isArray(coords.coordinates)) {
          (jobPost.location as any).coordinates = {
            latitude: coords.coordinates[1],
            longitude: coords.coordinates[0],
          };
        }
      }
      return jobPost;
    });

    // If excludeContractorId is provided, filter out job posts where contractor already contacted
    if (excludeContractorId) {
      const { ContractorContact } = await import('@/models');
      const contactedJobPostIds = await ContractorContact.find({
        contractorId: new Types.ObjectId(excludeContractorId),
      })
        .distinct('jobPostId')
        .exec();

      return convertedPosts.filter(
        (jobPost) => !contactedJobPostIds.some((id) => id.toString() === jobPost._id.toString())
      );
    }

    return convertedPosts;
  }

  /**
   * Delete job post
   */
  async deleteJobPost(id: string, homeownerId: string): Promise<boolean> {
    const result = await JobPost.findOneAndDelete({
      _id: id,
      homeownerId: new Types.ObjectId(homeownerId),
    }).exec();
    return Boolean(result);
  }
}

export default new JobPostService();

