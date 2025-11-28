import { Types } from 'mongoose';
import CustomError from '@/utils/customError';
import { JobPost } from '@/models';
import {
  IJobPostAttributes,
  IJobPostCreationAttributes,
  IJobPostDocument,
  IPaginatedResponse,
} from '@/types';

/**
 * Job Post Service
 */
class JobPostService {
  /**
   * Generate a random 6-digit job number
   */
  private generatejobNumber(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

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

    // Generate unique job number
    let jobNumber: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      jobNumber = this.generatejobNumber();
      const existing = await JobPost.findOne({ jobNumber }).exec();
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique job number');
    }

    const jobPost = await JobPost.create({
      ...jobPostData,
      jobNumber: jobNumber!,
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
      .populate('homeowner', 'firstName lastName email')
      .exec();
  }

  /**
   * Find all job posts by homeowner
   */
  async findJobPostsByHomeowner(
    homeownerId: string,
    status?: 'active' | 'closed',
    page: number = 1,
    limit: number = 20
  ): Promise<IPaginatedResponse<IJobPostAttributes>> {
    const filters: any = { homeownerId: new Types.ObjectId(homeownerId) };
    if (status) {
      filters.status = status;
    }

    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      JobPost.find(filters)
        .populate('homeowner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      JobPost.countDocuments(filters).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
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
      .populate('homeowner', 'firstName lastName email')
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
    excludeContractorId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IPaginatedResponse<IJobPostAttributes>> {
    const filters: any = {
      status: 'active'
    };

    // Only apply radius filter if radiusKm > 0 and coordinates are provided
    // If radiusKm is 0 or null, it means "All" - no radius filtering
    if (radiusKm > 0 && latitude && longitude) {
      // Convert radius from km to radians (Earth's radius in km is ~6371)
      const radiusInRadians = radiusKm / 6371;
      // Use $geoWithin with $centerSphere to allow custom sorting
      // $centerSphere uses [longitude, latitude] and radius in radians
      filters['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [
            [longitude, latitude],
            radiusInRadians,
          ],
        },
      };
    }

    // Filter by categories - use categories sent from frontend
    // Frontend is responsible for sending contractor's profile categories
    if (categories && categories.length > 0) {
      // Only show jobs where at least one category matches the provided categories
      filters.categories = { $in: categories };
    }

    // Count total matching documents (before exclusion for pagination calculation)
    const totalCount = await JobPost.countDocuments(filters).exec();
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const skip = (page - 1) * limit;

    // Use .lean() to get plain JavaScript objects directly (not Mongoose documents)
    let jobPosts = await JobPost.find(filters)
      .populate('homeowner', 'firstName lastName email')
      .lean({ virtuals: true }) // Returns plain objects with virtuals
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Convert GeoJSON coordinates back to lat/lng format for frontend
    const convertedPosts = jobPosts.map((jobPost: any) => {
      jobPost.id = jobPost._id.toString();
      if (jobPost.location?.coordinates) {
        const coords = jobPost.location.coordinates as any;
        if (coords.coordinates && Array.isArray(coords.coordinates)) {
          jobPost.location.coordinates = {
            latitude: coords.coordinates[1],
            longitude: coords.coordinates[0],
          };
        }
      }
      return jobPost;
    });



    // Note: totalCount is calculated before exclusion, so it may be slightly higher than actual
    // This is acceptable for pagination purposes as it provides an upper bound
    return {
      data: convertedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
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

