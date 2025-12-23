import Job from '@/models/Job';
import User from '@/models/User';
import socketService from '@/socket/socket';
import emailService from '@/services/emailService';
import logger from '@/utils/logger';
import { USER_ROLES } from '@enums';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if job categories overlap with contractor categories
 */
function hasCategoryMatch(jobCategories: string[], contractorCategories: string[]): boolean {
  if (!contractorCategories || contractorCategories.length === 0) {
    return false;
  }
  return jobCategories.some((category) =>
    contractorCategories.some(
      (contractorCategory) =>
        contractorCategory.toLowerCase() === category.toLowerCase()
    )
  );
}

/**
 * Notification Service
 * Handles checking jobs and sending notifications to matching contractors
 */
class NotificationService {
  /**
   * Check unchecked jobs and send notifications to matching contractors
   */
  async checkAndSendNotifications(): Promise<void> {
    try {
      logger.info('Starting notification check for unchecked jobs');

      // Find all open jobs that haven't been checked for notifications
      const uncheckedJobs = await Job.find({
        status: 'open',
        notificationsChecked: { $ne: true },
      }).populate('homeownerId', 'firstName lastName email');

      if (uncheckedJobs.length === 0) {
        logger.info('No unchecked jobs found');
        return;
      }

      logger.info(`Found ${uncheckedJobs.length} unchecked job(s)`);

      // Process each job
      for (const job of uncheckedJobs) {
        try {
          await this.processJobNotifications(job);
        } catch (error: any) {
          logger.error(`Error processing notifications for job ${job._id}:`, error);
          // Continue with next job even if one fails
        }
      }

      logger.info('Notification check completed');
    } catch (error: any) {
      logger.error('Error in checkAndSendNotifications:', error);
      throw error;
    }
  }

  /**
   * Process notifications for a single job
   */
  private async processJobNotifications(job: any): Promise<void> {
    // Job uses GeoJSON format: location.coordinates.coordinates = [longitude, latitude]
    const jobLocation = job.location?.coordinates?.coordinates;
    if (!jobLocation || !Array.isArray(jobLocation) || jobLocation.length !== 2) {
      logger.warn(`Job ${job._id} has invalid location coordinates`);
      // Mark as checked even if invalid to avoid reprocessing
      await Job.updateOne({ _id: job._id }, { notificationsChecked: true });
      return;
    }

    const [jobLongitude, jobLatitude] = jobLocation;

    // Find all contractors with notifications enabled
    const contractors = await User.find({
      role: USER_ROLES.CONTRACTOR,
      notificationEnabled: true,
      'contractorAddress.coordinates.latitude': { $exists: true, $ne: null },
      'contractorAddress.coordinates.longitude': { $exists: true, $ne: null },
      status: 'allow', // Only active contractors
    });

    if (contractors.length === 0) {
      logger.info(`No contractors found for job ${job._id}`);
      await Job.updateOne({ _id: job._id }, { notificationsChecked: true });
      return;
    }

    let notificationCount = 0;

    // Check each contractor
    for (const contractor of contractors) {
      try {
        const contractorLat = contractor.contractorAddress?.coordinates?.latitude;
        const contractorLon = contractor.contractorAddress?.coordinates?.longitude;
        const notificationRadius = contractor.notificationRadius || 50;

        if (!contractorLat || !contractorLon) {
          continue;
        }

        if (job.homeownerId.toString() === contractor.id.toString()) continue;

        // Calculate distance
        const distance = calculateDistance(
          jobLatitude,
          jobLongitude,
          contractorLat,
          contractorLon
        );

        // Check if within radius
        if (distance > notificationRadius) {
          continue;
        }

        // Check category match
        const contractorCategories = contractor.constructionCategories || [];
        if (!hasCategoryMatch(job.categories || [], contractorCategories)) {
          continue;
        }

        // Send notification
        await this.sendNotificationToContractor(contractor, job, distance);
        notificationCount++;
      } catch (error: any) {
        logger.error(
          `Error sending notification to contractor ${contractor._id} for job ${job._id}:`,
          error
        );
        // Continue with next contractor
      }
    }

    logger.info(
      `Sent ${notificationCount} notification(s) for job ${job._id} (${job.jobTitle})`
    );

    // Mark job as checked
    await Job.updateOne({ _id: job._id }, { notificationsChecked: true });
  }

  /**
   * Send notification to a contractor (via socket and email)
   */
  private async sendNotificationToContractor(
    contractor: any,
    job: any,
    distance: number
  ): Promise<void> {
    const contractorName = `${contractor.firstName} ${contractor.lastName}`;
    const homeowner = job.homeownerId;
    const homeownerName = homeowner
      ? `${homeowner.firstName} ${homeowner.lastName}`
      : 'A homeowner';

    // Send socket notification
    try {
      socketService.emitToUser(contractor._id.toString(), 'new_job_notification', {
        jobId: job._id.toString(),
        jobTitle: job.jobTitle,
        jobNumber: job.jobNumber,
        description: job.description,
        categories: job.categories,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
        location: job.location?.address,
        jobSize: job.jobSize,
      });
      logger.info(`Socket notification sent to contractor ${contractor._id}`);
    } catch (error: any) {
      logger.error(`Error sending socket notification to contractor ${contractor._id}:`, error);
    }

    // Send email notification
    try {
      await emailService.sendNewJobNotification(
        contractor.email,
        contractorName,
        job.jobTitle,
        job.jobNumber,
        job.description,
        job.categories || [],
        job.jobSize,
        job.location?.address || 'Location not specified',
        distance,
        job.structureType
      );
      logger.info(`Email notification sent to contractor ${contractor._id}`);
    } catch (error: any) {
      logger.error(`Error sending email notification to contractor ${contractor._id}:`, error);
    }
  }
}

export default new NotificationService();

