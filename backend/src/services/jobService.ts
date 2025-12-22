import Contact from '@/models/Contact';
import Job from '@/models/Job';
import { IPaginatedResponse, IJobAttributes, IContactDocument, IJobCreationAttributes, IJobDocument, IJobStatus } from '@/types';
import { IProvince } from '@/types';
import { Types } from 'mongoose';
import CustomError from '@/utils/customError';

/**
 * Job Service
 */
class JobService {
    /**
     * Find jobs within radius (for contractors)
     */
    async findContractorJobsWithinRadius(
        status: IJobStatus,
        latitude: number,
        longitude: number,
        radiusKm: number,
        categories?: string[],
        excludeContractorId?: string,
        page: number = 1,
        limit: number = 20,
        cities?: string[],
        province?: IProvince
    ): Promise<IPaginatedResponse<IJobAttributes>> {
        const filters: any = {};
        
        // Always exclude pending jobs from contractor searches (pending jobs are private/invite-only)
        if (status && status !== 'all' && status !== 'pending') {
            filters.status = status;
        } else {
            // If status is 'all', 'pending', or not provided, exclude pending jobs
            filters.status = { $ne: 'pending' };
        }

        if (excludeContractorId) {
            filters['homeownerId'] = { $ne: excludeContractorId };
        }

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

        // Filter by cities (multiple selection)
        if (cities && cities.length > 0) {
            filters['location.cityName'] = { $in: cities };
        }

        // Filter by province
        if (province) {
            filters['location.province'] = province;
        }

        

        // Count total matching documents (before exclusion for pagination calculation)
        const totalCount = await Job.countDocuments(filters).exec();
        const totalPages = Math.ceil(totalCount / limit) || 1;

        const skip = (page - 1) * limit;

        // Use .lean() to get plain JavaScript objects directly (not Mongoose documents)
        let jobs = await Job.find(filters)
            .populate('homeowner', 'firstName lastName email')
            .lean({ virtuals: true }) // Returns plain objects with virtuals
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        // Convert GeoJSON coordinates back to lat/lng format for frontend
        const convertedJobs = jobs.map((job: any) => {
            job.id = job._id.toString();
            if (job.location?.coordinates) {
                const coords = job.location.coordinates as any;
                if (coords.coordinates && Array.isArray(coords.coordinates)) {
                    job.location.coordinates = {
                    latitude: coords.coordinates[1],
                    longitude: coords.coordinates[0],
                };
                }
            }
            return job;
        });



        // Note: totalCount is calculated before exclusion, so it may be slightly higher than actual
        // This is acceptable for pagination purposes as it provides an upper bound
        return {
            data: convertedJobs,
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
     * Find contractor contact by job and contractor
     */
    async findContactByJobAndContractor(
        jobId: string,
        contractorId: string
    ): Promise<IContactDocument | null> {
        return Contact.findOne({
            jobId: new Types.ObjectId(jobId),
            contractorId: new Types.ObjectId(contractorId),
        })
            .populate('contractor', 'firstName lastName email')
            .populate('chatRoom')
            .exec();
    }

     /**
     * Find all jobs by homeowner
     */
    async findJobsByHomeowner(
        homeownerId: string,
        status?: IJobStatus,
        page: number = 1,
        limit: number = 20
    ): Promise<IPaginatedResponse<IJobAttributes>> {
        const filters: any = { homeownerId: new Types.ObjectId(homeownerId) };
        if (status && status !== 'all') {
            filters.status = status;
        }

        const skip = (page - 1) * limit;

        const [data, totalCount] = await Promise.all([
            Job.find(filters)
                .populate('homeowner', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            Job.countDocuments(filters).exec(),
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
     * Generate a random 6-digit job number
     */
    private generatejobNumber(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Create a new job
     */
    async createJob(jobData: IJobCreationAttributes): Promise<IJobDocument> {
        // Handle both GeoJSON format and lat/lng format
        let geoJsonCoordinates: [number, number];
        
        if ('coordinates' in jobData.location.coordinates && Array.isArray(jobData.location.coordinates.coordinates)) {
            // Already in GeoJSON format
            geoJsonCoordinates = jobData.location.coordinates.coordinates as [number, number];
            } else if ('latitude' in jobData.location.coordinates && 'longitude' in jobData.location.coordinates) {
            // Convert from lat/lng to GeoJSON [longitude, latitude]
            geoJsonCoordinates = [
                jobData.location.coordinates.longitude,
                jobData.location.coordinates.latitude,
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
            const existing = await Job.findOne({ jobNumber }).exec();
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Failed to generate unique job number');
        }

        const job = await Job.create({
            ...jobData,
            jobNumber: jobNumber!,
            homeownerId: new Types.ObjectId(jobData.homeownerId),
            contractorContactsCount: 0,
            status: 'pending',
            location: {
                address: jobData.location.address,
                coordinates: {
                type: 'Point',
                coordinates: geoJsonCoordinates,
                },
                streetNumber: jobData.location.streetNumber,
                streetName: jobData.location.streetName,
                unitNumber: jobData.location.unitNumber,
                cityName: jobData.location.cityName,
                areaCode: jobData.location.areaCode,
                province: jobData.location.province,
            },
        });
        return job;
    }

    /**
     * Find job by ID
     */
    async findJobById(id: string): Promise<IJobDocument | null> {
        if (!id) {
            return null;
        }
        return Job.findById(id)
            .populate('homeowner', 'firstName lastName email')
            .exec();
    }

    /**
     * Update job
     */
    async updateJob(
        id: string,
        homeownerId: string,
        updateData: Partial<IJobCreationAttributes>
    ): Promise<IJobDocument | null> {
        const job = await Job.findOne({
            _id: id,
            homeownerId: new Types.ObjectId(homeownerId),
        }).exec();

        if (!job) {
            throw new CustomError('Job not found', 404);
        }

        const updated = await Job.findByIdAndUpdate(id, updateData, { new: true })
            .populate('homeowner', 'firstName lastName email')
            .exec();
        return updated;
    }

     /**
     * Close job
     */
    async closeJob(id: string, homeownerId: string): Promise<IJobDocument | null> {
        return this.updateJob(id, homeownerId, { status: 'closed' });
    }

    /**
     * Post job to market (change status from pending to open)
     */
    async postJobToMarket(id: string, homeownerId: string): Promise<IJobDocument | null> {
        const job = await Job.findOne({
            _id: id,
            homeownerId: new Types.ObjectId(homeownerId),
        }).exec();

        if (!job) {
            throw new CustomError('Job not found', 404);
        }

        if (job.status !== 'pending') {
            throw new CustomError('Only pending jobs can be posted to market', 400);
        }

        const updated = await Job.findByIdAndUpdate(
            id,
            { status: 'open' },
            { new: true }
        )
            .populate('homeowner', 'firstName lastName email')
            .exec();
        return updated;
    }

    /**
     * Increment contractor contacts count
     */
    async incrementContractorContactsCount(id: string): Promise<void> {
        await Job.findByIdAndUpdate(id, { $inc: { contractorContactsCount: 1 } }).exec();
    }

    /**
     * Delete job
     */
    async deleteJob(id: string, homeownerId: string): Promise<boolean> {
        const result = await Job.findOneAndDelete({
        _id: id,
        homeownerId: new Types.ObjectId(homeownerId),
        }).exec();
        return Boolean(result);
    }

}

export default new JobService();