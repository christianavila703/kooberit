import Agenda, { Job } from 'agenda';
import { MONGODB_URI } from './constants';
import logger from '@/utils/logger';
import notificationService from '@/services/notificationService';

let agenda: Agenda | null = null;

/**
 * Initialize Agenda scheduler
 */
export const initializeAgenda = async (): Promise<void> => {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    agenda = new Agenda({
      db: {
        address: MONGODB_URI,
        collection: 'schedules-agenda',
      },
      maxConcurrency: 1, // Only run one job at a time
    });

    // Define the job
    agenda.define('check-job-notifications', async (job: Job) => {
      try {
        logger.info('Running scheduled job: check-job-notifications');
        await notificationService.checkAndSendNotifications();
      } catch (error: any) {
        logger.error('Error in scheduled job check-job-notifications:', error);
        throw error;
      }
    });

    // Start Agenda
    await agenda.start();
    logger.info('Agenda scheduler started');

    // Schedule the job to run every minute
    await agenda.every('1 minute', 'check-job-notifications');
    logger.info('Scheduled job-notifications check to run every minute');

    // Handle graceful shutdown
    const graceful = async () => {
      if (agenda) {
        await agenda.stop();
        logger.info('Agenda stopped gracefully');
        process.exit(0);
      }
    };

    process.on('SIGTERM', graceful);
    process.on('SIGINT', graceful);
  } catch (error: any) {
    logger.error('Error initializing Agenda:', error);
    throw error;
  }
};

/**
 * Get Agenda instance
 */
export const getAgenda = (): Agenda | null => {
  return agenda;
};

/**
 * Stop Agenda scheduler
 */
export const stopAgenda = async (): Promise<void> => {
  try {
    if (agenda) {
      await agenda.stop();
      agenda = null;
      logger.info('Agenda scheduler stopped');
    }
  } catch (error: any) {
    logger.error('Error stopping Agenda:', error);
    throw error;
  }
};

export default agenda;

