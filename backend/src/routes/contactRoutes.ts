import { Router } from 'express';
import * as contactController from '@/controllers/contactController';
import { validate } from '@/middlewares/validate';
import { createContactSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/contacts/job/:jobId
 * @desc    Get contacts for a job
 * @access  Private (Homeowner)
 */
router.get('/job/:jobId', contactController.getContactsByJob);

/**
 * @route   GET /api/contacts/homeowner
 * @desc    Get all contacts for homeowner
 * @access  Private (Homeowner)
 */
router.get('/homeowner', contactController.getHomeownerContractorContacts);

/**
 * @route   GET /api/contacts/check/:jobId
 * @desc    Check if has contacted a job
 * @access  Private (Contractor)
 */
router.get('/check/:jobId', contactController.checkContractorContact);

/**
 * @route   POST /api/contacts
 * @desc    Create contact (when contractor pays)
 * @access  Private (Contractor)
 */
router.post('/', validate(createContactSchema, 'body'), contactController.createContact);

export default router;

