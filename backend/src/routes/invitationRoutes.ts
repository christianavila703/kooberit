import { Router } from 'express';
import {
  createExternalInvitation,
  createInternalInvitation,
  validateInvitationCode,
  getInvitationsByInviter,
  getInvitationCountByJob,
  checkInvitationByJobAndContractor,
} from '@/controllers/invitationController';
import { isAuthenticated } from '@/middlewares/auth';

const router = Router();

// Create external invitation (requires auth - only contractors can invite)
router.post('/external', isAuthenticated, createExternalInvitation);

// Create internal invitation (requires auth)
router.post('/internal', isAuthenticated, createInternalInvitation);

// Validate invitation code (public endpoint for signup flow)
router.get('/validate/:code', validateInvitationCode);

// Get invitations by inviter (requires auth)
router.get('/my-invitations', isAuthenticated, getInvitationsByInviter);

// Get invitation count by job (requires auth)
router.get('/job/:jobId/count', isAuthenticated, getInvitationCountByJob);

// Check if contractor has been invited to a job (requires auth)
router.get('/job/:jobId/check', isAuthenticated, checkInvitationByJobAndContractor);

export default router;

