import { Router } from 'express';
import * as contactController from '@/controllers/contactController';
import { validate } from '@/middlewares/validate';
import { createContactSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/contacts/job-post/:jobPostId
 * @desc    Get contacts for a job post
 * @access  Private (Homeowner)
 */
router.get('/job-post/:jobPostId', contactController.getContactsByJobPost);

/**
 * @route   GET /api/contacts/homeowner
 * @desc    Get all contacts for homeowner
 * @access  Private (Homeowner)
 */
router.get('/homeowner', contactController.getHomeownerContractorContacts);

/**
 * @route   GET /api/contacts/check/:jobPostId
 * @desc    Check if has contacted a job post
 * @access  Private (Contractor)
 */
router.get('/check/:jobPostId', contactController.checkContractorContact);

/**
 * @route   POST /api/contacts
 * @desc    Create contact (when contractor pays)
 * @access  Private (Contractor)
 */
router.post('/', validate(createContactSchema, 'body'), contactController.createContact);

export default router;

