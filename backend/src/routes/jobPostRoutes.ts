import { Router } from 'express';
import * as jobPostController from '@/controllers/jobPostController';
import { validate } from '@/middlewares/validate';
import { createJobPostSchema, updateJobPostSchema, fetchHomeownerJobPostsSchema } from '@/validators';

const router = Router();

/**
 * @route   POST /api/job-posts
 * @desc    Create a new job post
 * @access  Private (Homeowner)
 */
router.post('/', validate(createJobPostSchema, 'body'), jobPostController.createJobPost);

/**
 * @route   GET /api/job-posts/homeowner
 * @desc    Get all job posts for homeowner
 * @access  Private (Homeowner)
 */
router.get('/homeowner', validate(fetchHomeownerJobPostsSchema, 'query'), jobPostController.getHomeownerJobPosts);

/**
 * @route   GET /api/job-posts/:id
 * @desc    Get job post by ID
 * @access  Private
 */
router.get('/:id', jobPostController.getJobPostById);

/**
 * @route   PUT /api/job-posts/:id
 * @desc    Update job post
 * @access  Private (Homeowner)
 */
router.put('/:id', validate(updateJobPostSchema, 'body'), jobPostController.updateJobPost);

/**
 * @route   PATCH /api/job-posts/:id/close
 * @desc    Close job post
 * @access  Private (Homeowner)
 */
router.patch('/:id/close', jobPostController.closeJobPost);

/**
 * @route   DELETE /api/job-posts/:id
 * @desc    Delete job post
 * @access  Private (Homeowner)
 */
router.delete('/:id', jobPostController.deleteJobPost);

export default router;

