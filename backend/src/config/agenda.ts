import Agenda, { Job } from 'agenda';
import { MONGODB_URI } from './constants';
import logger from '@/utils/logger';
import notificationService from '@/services/notificationService';
import bidService from '@/services/bidService';
import chatService from '@/services/chatService';
import { Chat, Message } from '@/models';
import { USER_ROLES } from './enums';

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

    // Define job to check for bids needing extension prompts (on due date)
    agenda.define('check-extension-prompts', async (job: Job) => {
      try {
        logger.info('Running scheduled job: check-extension-prompts');
        const bids = await bidService.findBidsNeedingExtensionPrompt();
        
        for (const bid of bids) {
          try {
            // Find chat between contractor and homeowner
            const chat = await chatService.findChatByJobAndUsers(
              bid.jobId.toString(),
              bid.homeownerId.toString(),
              bid.contractorId.toString()
            );

            if (chat) {
              // Check if we've already sent the prompt today
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const existingMessage = await Message.findOne({
                chatId: chat._id,
                type: 'system',
                content: { $regex: /Would you like to ask the homeowner for/ },
                createdAt: { $gte: today },
              }).exec();

              if (!existingMessage) {
                // Send extension prompt message
                const extensionPrompt = 'Would you like to ask the homeowner for an extension on the project due date?';
                await Message.create({
                  chatId: chat._id,
                  senderId: bid.homeownerId,
                  content: extensionPrompt,
                  type: 'system',
                  isRead: false,
                  visibleTo: USER_ROLES.CONTRACTOR,
                });

                // Send budget change prompt
                const budgetPrompt = 'Would you like to ask the homeowner for a change in the value of bid?';
                await Message.create({
                  chatId: chat._id,
                  senderId: bid.homeownerId,
                  content: budgetPrompt,
                  type: 'system',
                  isRead: false,
                  visibleTo: USER_ROLES.CONTRACTOR,
                });

                // Increment unread counts
                await Chat.findByIdAndUpdate(chat._id, {
                  $inc: {
                    contractorUnreadCount: 1,
                  },
                }).exec();

                logger.info(`Extension prompts sent for bid: ${bid._id}`);
              }
            }
          } catch (error: any) {
            logger.error(`Error sending extension prompt for bid ${bid._id}:`, error);
          }
        }
      } catch (error: any) {
        logger.error('Error in scheduled job check-extension-prompts:', error);
        throw error;
      }
    });

    // Define job to check for bids needing completion prompts (1 day after due date)
    agenda.define('check-completion-prompts', async (job: Job) => {
      try {
        logger.info('Running scheduled job: check-completion-prompts');
        const bids = await bidService.findBidsNeedingCompletionPrompt();
        
        for (const bid of bids) {
          try {
            // Find chat between contractor and homeowner
            const chat = await chatService.findChatByJobAndUsers(
              bid.jobId.toString(),
              bid.homeownerId.toString(),
              bid.contractorId.toString()
            );

            if (chat) {
              // Check if we've already sent the prompt
              const existingMessage = await Message.findOne({
                chatId: chat._id,
                type: 'system',
                content: { $regex: /Has the Contractor completed/ },
              }).exec();

              if (!existingMessage) {
                // Send completion prompts to homeowner
                const onTimePrompt = 'Has the Contractor completed the work by the project due date?';
                const onBudgetPrompt = 'Has the Contractor completed the work within value of bid?';
                
                await Message.create({
                  chatId: chat._id,
                  senderId: bid.contractorId,
                  content: onTimePrompt,
                  type: 'system',
                  isRead: false,
                  visibleTo: USER_ROLES.HOMEOWNER,
                });

                await Message.create({
                  chatId: chat._id,
                  senderId: bid.contractorId,
                  content: onBudgetPrompt,
                  type: 'system',
                  isRead: false,
                  visibleTo: USER_ROLES.HOMEOWNER,
                });

                // Increment unread counts
                await Chat.findByIdAndUpdate(chat._id, {
                  $inc: { 
                    homeownerUnreadCount: 1,
                  },
                }).exec();

                logger.info(`Completion prompts sent for bid: ${bid._id}`);
              }
            }
          } catch (error: any) {
            logger.error(`Error sending completion prompt for bid ${bid._id}:`, error);
          }
        }
      } catch (error: any) {
        logger.error('Error in scheduled job check-completion-prompts:', error);
        throw error;
      }
    });

    // Start Agenda
    await agenda.start();
    logger.info('Agenda scheduler started');

    // await agenda.now('check-extension-prompts', {});

    // Schedule the job to run every minute
    await agenda.every('1 minute', 'check-job-notifications');
    logger.info('Scheduled job-notifications check to run every minute');

    // Schedule extension prompts check to run daily at midnight
    await agenda.every('1 day', 'check-extension-prompts');
    logger.info('Scheduled extension prompts check to run daily');

    // Schedule completion prompts check to run daily at midnight
    await agenda.every('1 day', 'check-completion-prompts');
    logger.info('Scheduled completion prompts check to run daily');

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

