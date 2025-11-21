import { Router } from 'express';
import * as contractorController from '@/controllers/contractorController';
import { validate } from '@/middlewares/validate';
import { fetchJobBoardSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/contractor/job-board
 * @desc    Get job board for contractor (filtered by radius and categories)
 * @access  Private (Contractor)
 */
router.get('/job-board', validate(fetchJobBoardSchema, 'query'), contractorController.getJobBoard);

export default router;

