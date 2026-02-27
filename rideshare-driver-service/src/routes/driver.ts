import express from 'express';
import { DriverController } from '../controllers/driverController';
import { authenticateDriver } from '../middleware/auth';

const router = express.Router();


router.post('/auth/register', DriverController.register);
router.post('/auth/login', DriverController.login);
router.post('/auth/verify-email', DriverController.verifyEmail);
router.post('/auth/forgot-password', DriverController.forgotPassword);
router.post('/auth/reset-password', DriverController.resetPassword);

router.get('/me', authenticateDriver, DriverController.getCurrentDriver);
router.get('/availability', authenticateDriver, DriverController.getAvailability);
router.patch('/availability', authenticateDriver, DriverController.updateAvailability);

router.post('/location', authenticateDriver, DriverController.updateLocation);
router.get('/location', authenticateDriver, DriverController.getCurrentLocation);


router.get('/dashboard', authenticateDriver, DriverController.getDashboard);
router.get('/earnings', authenticateDriver, DriverController.getMyEarnings);
router.get('/trips', authenticateDriver, DriverController.getMyTrips);
router.get('/completed-trips', authenticateDriver, DriverController.getMyCompletedTrips);
router.get('/active-trip', authenticateDriver, DriverController.getMyActiveTrip);
router.get('/trips/:tripId', authenticateDriver, DriverController.getTripDetails);


router.post(
  '/ride-requests/:requestId/accept',
  authenticateDriver,
  DriverController.acceptRide
);

router.get('/:id', DriverController.getDriver);

export default router;
