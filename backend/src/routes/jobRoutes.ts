import { Router } from 'express';
import * as jobController from '@/controllers/jobController';
import { validate } from '@/middlewares/validate';
import { createJobSchema, updateJobSchema, fetchContractorJobsSchema, fetchHomeownerJobsSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/jobs/contractor
 * @desc    Get all contractor jobs
 */
router.get('/contractor', validate(fetchContractorJobsSchema, 'query'), jobController.getContractorJobs);

/**
 * @route   GET /api/jobs/homeowner
 * @desc    Get all homeowner jobs
 */
router.get('/homeowner', validate(fetchHomeownerJobsSchema, 'query'), jobController.getHomeownerJobs);


/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 */
router.post('/', validate(createJobSchema, 'body'), jobController.createJob);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job by ID
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job
 */
router.put('/:id', validate(updateJobSchema, 'body'), jobController.updateJob);

/**
 * @route   PATCH /api/jobs/:id/close
 * @desc    Close job
 */
router.patch('/:id/close', jobController.closeJob);

/**
 * @route   POST /api/jobs/:id/post
 * @desc    Post job to market (change status from pending to open)
 */
router.post('/:id/post', jobController.postJobToMarket);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job
 */
router.delete('/:id', jobController.deleteJob);

export default router;