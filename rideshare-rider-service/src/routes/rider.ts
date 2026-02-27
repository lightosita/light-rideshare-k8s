import express from 'express';
import { RiderController } from '../controllers/riderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/auth/register', RiderController.register);
router.post('/auth/login', RiderController.login);
router.post('/auth/verify-email', RiderController.verifyEmail);
router.post('/auth/forgot-password', RiderController.forgotPassword);
router.post('/auth/reset-password', RiderController.resetPassword);

router.get('/auth/google', RiderController.googleAuth);
router.get('/auth/google/callback', RiderController.googleAuthCallback);
router.get('/me', authenticateToken, RiderController.getCurrentRider);
router.post('/ride-requests', authenticateToken, RiderController.createRideRequest);

router.get('/me/trips', authenticateToken, RiderController.getMyTrips);
router.get('/me/trips/statistics', authenticateToken, RiderController.getTripStatistics);
router.get('/me/trips/recent', authenticateToken, RiderController.getRecentTrips);
router.get('/me/trips/:tripId', authenticateToken, RiderController.getTripDetails);
router.get('/me/dashboard', authenticateToken, RiderController.getDashboard);


router.get('/ride-requests/:rideRequestId/active', authenticateToken, RiderController.getActiveRideDetails);


export default router;