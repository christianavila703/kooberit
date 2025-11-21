import { Router } from 'express';
import * as contractorController from '@/controllers/contractorController';

const router = Router();

/**
 * @route   GET /api/contractor/job-board
 * @desc    Get job board for contractor (filtered by radius and categories)
 * @access  Private (Contractor)
 */
router.get('/job-board', contractorController.getJobBoard);

/**
 * @route   GET /api/contractor/settings
 * @desc    Get contractor settings
 * @access  Private (Contractor)
 */
router.get('/settings', contractorController.getContractorSettings);

/**
 * @route   PUT /api/contractor/settings
 * @desc    Update contractor settings
 * @access  Private (Contractor)
 */
router.put('/settings', contractorController.updateContractorSettings);

export default router;

