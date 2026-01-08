import { Router } from 'express';
import * as bidController from '@/controllers/bidController';
import { validate } from '@/middlewares/validate';
import { createBidSchema, createExtensionRequestSchema, respondToExtensionRequestSchema, updateCompletionStatusSchema } from '@/validators';

const router = Router();

/**
 * @route   POST /api/bids
 * @desc    Create a new bid
 */
router.post('/', validate(createBidSchema, 'body'), bidController.createBid);

/**
 * @route   GET /api/bids/contractor
 * @desc    Get all bids by contractor
 */
router.get('/contractor', bidController.getBidsByContractor);

/**
 * @route   GET /api/bids/homeowner
 * @desc    Get all bids by homeowner
 */
router.get('/homeowner', bidController.getBidsByHomeowner);

/**
 * @route   GET /api/bids/job/:jobId
 * @desc    Get all bids for a job
 */
router.get('/job/:jobId', bidController.getBidsByJob);

/**
 * @route   GET /api/bids/chat/:chatId
 * @desc    Get all bids for a chat
 */
router.get('/chat/:chatId', bidController.getBidsByChat);

/**
 * @route   GET /api/bids/:id
 * @desc    Get bid by ID
 */
router.get('/:id', bidController.getBidById);

/**
 * @route   POST /api/bids/:id/award
 * @desc    Award a bid
 */
router.post('/:id/award', bidController.awardBid);

/**
 * @route   POST /api/bids/:id/reject
 * @desc    Reject a bid
 */
router.post('/:id/reject', bidController.rejectBid);

/**
 * @route   POST /api/bids/extension-request
 * @desc    Create extension/change request
 */
router.post('/extension-request', validate(createExtensionRequestSchema, 'body'), bidController.createExtensionRequest);

/**
 * @route   POST /api/bids/extension-request/:id/respond
 * @desc    Respond to extension/change request
 */
router.post('/extension-request/:id/respond', validate(respondToExtensionRequestSchema, 'body'), bidController.respondToExtensionRequest);

/**
 * @route   GET /api/bids/extension-request/pending
 * @desc    Get pending extension requests
 */
router.get('/extension-request/pending', bidController.getPendingExtensionRequests);

/**
 * @route   GET /api/bids/:bidId/extension-request
 * @desc    Get extension requests by bid
 */
router.get('/:bidId/extension-request', bidController.getExtensionRequestsByBid);

/**
 * @route   POST /api/bids/:bidId/completion-status
 * @desc    Update completion status
 */
router.post('/:bidId/completion-status', validate(updateCompletionStatusSchema, 'body'), bidController.updateCompletionStatus);

export default router;

