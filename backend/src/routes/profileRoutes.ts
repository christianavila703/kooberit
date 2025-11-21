import { Router } from 'express';
import * as profileController from '@/controllers/profileController';
import { validate } from '@/middlewares/validate';
import { updateProfileSettingsSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/profile/settings
 * @desc    Get profile settings (for both contractor and homeowner)
 * @access  Private
 */
router.get('/settings', profileController.getProfileSettings);

/**
 * @route   PUT /api/profile/settings
 * @desc    Update profile settings (for both contractor and homeowner)
 * @access  Private
 */
router.put('/settings', validate(updateProfileSettingsSchema), profileController.updateProfileSettings);

export default router;

