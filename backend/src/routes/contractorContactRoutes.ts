import { Router } from 'express';
import * as contractorContactController from '@/controllers/contractorContactController';
import { validate } from '@/middlewares/validate';
import { createContractorContactSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/contractor-contacts/job-post/:jobPostId
 * @desc    Get contractor contacts for a job post
 * @access  Private (Homeowner)
 */
router.get('/job-post/:jobPostId', contractorContactController.getContractorContactsByJobPost);

/**
 * @route   GET /api/contractor-contacts/homeowner
 * @desc    Get all contractor contacts for homeowner
 * @access  Private (Homeowner)
 */
router.get('/homeowner', contractorContactController.getHomeownerContractorContacts);

/**
 * @route   GET /api/contractor-contacts/check/:jobPostId
 * @desc    Check if contractor has contacted a job post
 * @access  Private (Contractor)
 */
router.get('/check/:jobPostId', contractorContactController.checkContractorContact);

/**
 * @route   POST /api/contractor-contacts
 * @desc    Create contractor contact (when contractor pays)
 * @access  Private (Contractor)
 */
router.post('/', validate(createContractorContactSchema, 'body'), contractorContactController.createContractorContact);

export default router;

