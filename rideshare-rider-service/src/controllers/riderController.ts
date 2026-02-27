import { Request, Response } from 'express';
import { RiderRepository, CreateRideRequestInput } from '../models/Riders';
import { AuthUtils } from '../utils/auth';
import { EmailServiceClient } from '../utils/email-service-client';
import { redis } from '../config/redis';
import { AuthRequest } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validation';
import { riderTripService } from '../utils/tripServiceClient';

export class RiderController {
  private static googleClient = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/riders/auth/google/callback'
  });


  private static async logAndPublish(channel: string, data: any): Promise<void> {
    const eventData = {
      event: channel,
      timestamp: new Date().toISOString(),
      data
    };

    try {
      await redis.publish(channel, JSON.stringify(eventData));
      console.log(`✅ REDIS PUBLISH SUCCESS [${channel}]`);
    } catch (error) {
      console.error(`❌ REDIS PUBLISH FAILED [${channel}]:`, error);
      throw error;
    }
  }

  static googleAuth = async (req: Request, res: Response) => {
    try {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:3001/api/v1/riders/auth/google/callback';

      const url = this.googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent',
        redirect_uri: redirectUri, // Add this line
        include_granted_scopes: true
      });

      console.log('🔗 Google OAuth URL:', url);

      // Publish event...
      await this.logAndPublish('rider.google_auth_initiated', {
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.redirect(url);

    } catch (error: any) {
      // Error handling...
    }
  };

  static googleAuthCallback = async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        await this.logAndPublish('rider.google_auth_callback_error', {
          error: 'invalid_code',
          ip: req.ip
        });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_google_auth`);
      }

      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        await this.logAndPublish('rider.google_auth_callback_error', {
          error: 'invalid_payload',
          ip: req.ip
        });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
      }

      const { email, given_name, family_name, picture } = payload;

      if (!email) {
        await this.logAndPublish('rider.google_auth_callback_error', {
          error: 'email_required',
          ip: req.ip
        });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=email_required`);
      }

      // Check if rider exists
      let rider = await RiderRepository.findRiderByEmail(email);

      if (!rider) {
        // Create new rider with Google auth
        const verificationToken = AuthUtils.generateRandomToken();

        rider = await RiderRepository.createRider({
          firstName: given_name || 'Google',
          lastName: family_name || 'User',
          email: email,
          phone: '+2340000000000',
          passwordHash: await AuthUtils.hashPassword(AuthUtils.generateRandomToken(16)),
          verificationToken: verificationToken
        });

        // Auto-verify Google users
        await RiderRepository.updateRiderVerification(rider.id, true);

        // Publish rider registered event
        await this.logAndPublish('rider.registered', {
          rider_id: rider.id,
          email: rider.email,
          name: `${rider.firstName} ${rider.lastName}`,
          phone: rider.phone,
          auth_method: 'google'
        });
      }

      // Publish Google auth success event
      await this.logAndPublish('rider.google_auth_success', {
        rider_id: rider.id,
        email: rider.email,
        auth_method: 'google'
      });

      const token = AuthUtils.generateToken({
        riderId: rider.id,
        email: rider.email,
        firstName: rider.firstName,
        lastName: rider.lastName,
        phone: rider.phone,
        rating: rider.rating || 4.8,
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&rider=${encodeURIComponent(JSON.stringify({
        id: rider.id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        email: rider.email,
        phone: rider.phone,
        isVerified: rider.isVerified,
        rating: rider.rating,
        totalTrips: rider.totalTrips,
      }))}`);

    } catch (error: any) {
      console.error('Google callback error:', error);

      await this.logAndPublish('rider.google_auth_callback_error', {
        error: error.message,
        ip: req.ip
      });

      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
    }
  };

  static register = async (req: Request, res: Response) => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        console.log('❌ VALIDATION FAILED:');
        console.log('Error details:', JSON.stringify(error.details, null, 2));
        console.log('Error message:', error.message);

        // Publish registration validation error
        await this.logAndPublish('rider.registration_validation_error', {
          error: error.details[0].message,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { email, password, firstName, lastName, phoneNumber } = value;

      const existingRider = await RiderRepository.findRiderByEmail(email);
      if (existingRider) {
        console.log('❌ Rider already exists with email:', email);

        // Publish duplicate registration attempt
        await this.logAndPublish('rider.registration_duplicate', {
          email: email,
          ip: req.ip
        });

        return res.status(409).json({
          success: false,
          error: 'Rider already exists with this email'
        });
      }

      const hashedPassword = await AuthUtils.hashPassword(password);
      const verificationToken = AuthUtils.generateRandomToken();
      const rider = await RiderRepository.createRider({
        firstName,
        lastName,
        email,
        phone: `+234${phoneNumber}`,
        passwordHash: hashedPassword,
        verificationToken
      });

      // Publish verification email sent event
      await this.logAndPublish('rider.verification_email_sent', {
        rider_id: rider.id,
        email: rider.email
      });

      EmailServiceClient.sendVerificationEmail(email, verificationToken)
        .then(success => {
          if (success) {
            console.log(`✅ Verification email sent to ${email}`);
          } else {
            console.log(`⚠️ Failed to send verification email to ${email}`);
          }
        })
        .catch(err => {
          console.error(`❌ Error sending verification email:`, err);
        });

      const token = AuthUtils.generateToken({
        riderId: rider.id,
        email: rider.email,
        firstName: rider.firstName,
        lastName: rider.lastName,
        phone: rider.phone,
        rating: rider.rating || 4.8,
      });

      await this.logAndPublish('rider.registered', {
        rider_id: rider.id,
        email: rider.email,
        name: `${rider.firstName} ${rider.lastName}`,
        phone: rider.phone,
        auth_method: 'manual'
      });

      res.status(201).json({
        success: true,
        data: {
          rider: {
            id: rider.id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            email: rider.email,
            phone: rider.phone,
            isVerified: rider.isVerified,
          },
          token
        }
      });

    } catch (error: any) {
      console.error('Registration error:', error);

      // Publish registration error event
      await this.logAndPublish('rider.registration_error', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        // Publish login validation error
        await this.logAndPublish('rider.login_validation_error', {
          error: error.details[0].message,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { email, password } = value;

      const rider = await RiderRepository.findRiderByEmail(email);
      if (!rider) {
        // Publish failed login attempt
        await this.logAndPublish('rider.login_failed', {
          email: email,
          reason: 'rider_not_found',
          ip: req.ip
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      if (!rider.isActive) {
        // Publish login attempt to deactivated account
        await this.logAndPublish('rider.login_failed', {
          rider_id: rider.id,
          email: rider.email,
          reason: 'account_deactivated',
          ip: req.ip
        });

        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      const isPasswordValid = await AuthUtils.comparePassword(password, rider.passwordHash);
      if (!isPasswordValid) {
        // Publish failed login attempt (invalid password)
        await this.logAndPublish('rider.login_failed', {
          rider_id: rider.id,
          email: rider.email,
          reason: 'invalid_password',
          ip: req.ip
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      await RiderRepository.updateLastLogin(rider.id);

      const token = AuthUtils.generateToken({
        riderId: rider.id,
        email: rider.email,
        firstName: rider.firstName,
        lastName: rider.lastName,
        phone: rider.phone,
        rating: rider.rating || 4.8,
      });

      // Publish successful login event
      await this.logAndPublish('rider.logged_in', {
        rider_id: rider.id,
        email: rider.email,
        name: `${rider.firstName} ${rider.lastName}`,
        login_time: new Date().toISOString(),
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: {
          rider: {
            id: rider.id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            email: rider.email,
            phone: rider.phone,
            isVerified: rider.isVerified,
            rating: rider.rating,
            totalTrips: rider.totalTrips,
          },
          token
        }
      });

    } catch (error: any) {
      console.error('Login error:', error);

      // Publish login error event
      await this.logAndPublish('rider.login_error', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static verifyEmail = async (req: Request, res: Response) => {
    try {
      const { error, value } = verifyEmailSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { token } = value;

      const rider = await RiderRepository.findRiderByVerificationToken(token);
      if (!rider) {
        // Publish invalid verification token attempt
        await this.logAndPublish('rider.verification_failed', {
          reason: 'invalid_token',
          token: token
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid verification token'
        });
      }

      if (rider.isVerified) {
        // Publish already verified attempt
        await this.logAndPublish('rider.verification_failed', {
          rider_id: rider.id,
          email: rider.email,
          reason: 'already_verified'
        });

        return res.status(400).json({
          success: false,
          error: 'Email already verified'
        });
      }

      const updatedRider = await RiderRepository.updateRiderVerification(rider.id, true);

      await this.logAndPublish('rider.verified', {
        rider_id: updatedRider.id,
        email: updatedRider.email,
        verified_at: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          rider: {
            id: updatedRider.id,
            firstName: updatedRider.firstName,
            lastName: updatedRider.lastName,
            email: updatedRider.email,
            phone: updatedRider.phone,
            isVerified: updatedRider.isVerified,
          }
        }
      });

    } catch (error: any) {
      console.error('Email verification error:', error);

      // Publish verification error event
      await this.logAndPublish('rider.verification_error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static forgotPassword = async (req: Request, res: Response) => {
    try {
      const { error, value } = forgotPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { email } = value;

      const rider = await RiderRepository.findRiderByEmail(email);
      if (!rider) {
        // Don't reveal whether email exists, but still publish event
        await this.logAndPublish('rider.forgot_password_requested', {
          email: email,
          status: 'email_not_found',
          ip: req.ip
        });

        return res.json({
          success: true,
          data: { message: 'If the email exists, a password reset link has been sent' }
        });
      }

      const resetToken = AuthUtils.generateRandomToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await RiderRepository.updateRiderResetToken(rider.id, resetToken, resetTokenExpiry);

      // Publish reset email sent event
      await this.logAndPublish('rider.password_reset_email_sent', {
        rider_id: rider.id,
        email: rider.email
      });

      // Send password reset email
      EmailServiceClient.sendPasswordResetEmail(email, resetToken)
        .then(success => {
          if (success) {
            console.log(`✅ Password reset email sent to ${email}`);
          } else {
            console.log(`⚠️ Failed to send password reset email to ${email}`);
          }
        })
        .catch(err => {
          console.error(`❌ Error sending password reset email:`, err);
        });

      await this.logAndPublish('rider.forgot_password', {
        rider_id: rider.id,
        email: rider.email,
        reset_token_created: new Date().toISOString(),
        ip: req.ip
      });

      res.json({
        success: true,
        data: { message: 'If the email exists, a password reset link has been sent' }
      });

    } catch (error: any) {
      console.error('Forgot password error:', error);

      // Publish forgot password error event
      await this.logAndPublish('rider.forgot_password_error', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static resetPassword = async (req: Request, res: Response) => {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { token, password } = value;

      const rider = await RiderRepository.findRiderByResetToken(token);
      if (!rider) {
        // Publish invalid reset token attempt
        await this.logAndPublish('rider.password_reset_failed', {
          reason: 'invalid_token',
          token: token,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      const hashedPassword = await AuthUtils.hashPassword(password);
      const updatedRider = await RiderRepository.updateRiderPassword(rider.id, hashedPassword);

      await this.logAndPublish('rider.password_reset', {
        rider_id: updatedRider.id,
        email: updatedRider.email,
        reset_at: new Date().toISOString(),
        ip: req.ip
      });

      res.json({
        success: true,
        data: { message: 'Password reset successfully' }
      });

    } catch (error: any) {
      console.error('Reset password error:', error);

      // Publish password reset error event
      await this.logAndPublish('rider.password_reset_error', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getCurrentRider = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;

      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const rider = await RiderRepository.findRiderById(riderId);
      if (!rider) {
        return res.status(404).json({
          success: false,
          error: 'Rider not found'
        });
      }

      // Publish profile view event
      await this.logAndPublish('rider.profile_viewed', {
        rider_id: rider.id,
        email: rider.email,
        viewed_at: new Date().toISOString(),
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          rider: {
            id: rider.id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            email: rider.email,
            phone: rider.phone,
            isVerified: rider.isVerified,
            rating: rider.rating,
            totalTrips: rider.totalTrips,
            createdAt: rider.createdAt,
          }
        }
      });

    } catch (error: any) {
      console.error('Get rider error:', error);

      // Publish profile view error event
      await this.logAndPublish('rider.profile_view_error', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getRider = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rider = await RiderRepository.findRiderById(id);

      if (!rider) {
        // Publish rider not found event
        await this.logAndPublish('rider.lookup_failed', {
          rider_id: id,
          reason: 'not_found',
          ip: req.ip
        });

        return res.status(404).json({
          success: false,
          error: 'Rider not found'
        });
      }

      // Publish rider lookup event
      await this.logAndPublish('rider.looked_up', {
        rider_id: rider.id,
        email: rider.email,
        looked_up_by: req.ip,
        looked_up_at: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          rider: {
            id: rider.id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            email: rider.email,
            phone: rider.phone,
            rating: rider.rating,
            totalTrips: rider.totalTrips,
          }
        }
      });

    } catch (error: any) {
      console.error('Get rider error:', error);

      // Publish rider lookup error event
      await this.logAndPublish('rider.lookup_error', {
        rider_id: req.params.id,
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static createRideRequest = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const {
        pickup_lat,
        pickup_lng,
        pickup_address,
        dropoff_lat,
        dropoff_lng,
        dropoff_address,
        vehicle_type,
        fare
      } = req.body;
      console.log(pickup_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type, fare)
      const isMissing = !pickup_lat || !pickup_lng ||
        !dropoff_lat || !dropoff_lng ||
        !fare;

      if (isMissing) {
        console.error('❌ Missing required fields in request');
        await this.logAndPublish('ride.request_validation_error', {
          rider_id: riderId,
          reason: 'missing_fields',
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Pickup and dropoff coordinates, and fare are required'
        });
      }

      const pickupLat = parseFloat(pickup_lat);
      const pickupLng = parseFloat(pickup_lng);
      const dropoffLat = parseFloat(dropoff_lat);
      const dropoffLng = parseFloat(dropoff_lng);
      const rideFare = parseFloat(fare);

      if (isNaN(pickupLat) || isNaN(pickupLng) || isNaN(dropoffLat) || isNaN(dropoffLng) || isNaN(rideFare) || rideFare <= 0) { // <-- VALIDATE FARE
        console.error('❌ Invalid numeric values:', {
          pickupLat, pickupLng, dropoffLat, dropoffLng, rideFare
        });

        await this.logAndPublish('ride.request_validation_error', {
          rider_id: riderId,
          reason: 'invalid_numeric_values',
          coordinates: { pickupLat, pickupLng, dropoffLat, dropoffLng },
          fare: rideFare,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid coordinate or fare values'
        });
      }


      // 1. Create Ride Request in Database
      const rideRequest = await RiderRepository.createRideRequest({
        riderId: riderId,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        pickupAddress: pickup_address,
        dropoffLat: dropoffLat,
        dropoffLng: dropoffLng,
        dropoffAddress: dropoff_address,
        vehicleType: vehicle_type
      });

      console.log(`✅ Ride request persisted with ID: ${rideRequest.id}`);

      // 2. Prepare Event Data
      const rideRequestDataForMatching = {
        ride_request_id: rideRequest.id,
        rider_id: rideRequest.riderId,
        rider_name: `${req.rider?.firstName || ''} ${req.rider?.lastName || ''}`.trim() || 'Passenger',
        rider_rating: req.rider?.rating || 4.8,
        pickup_location: {
          lat: rideRequest.pickupLat,
          lng: rideRequest.pickupLng,
          address: rideRequest.pickupAddress || 'Selected location'
        },
        dropoff_location: {
          lat: rideRequest.dropoffLat,
          lng: rideRequest.dropoffLng,
          address: rideRequest.dropoffAddress || 'Selected destination'
        },
        vehicle_type: rideRequest.vehicleType || 'standard',
        fare: rideRequest.estimatedFare || rideFare,
        requested_at: rideRequest.requestedAt.toISOString(),
        ip: req.ip
      };

      // 3. Publish Event
      await this.logAndPublish('ride.requested', rideRequestDataForMatching);

      console.log(`✅ Ride request ${rideRequestDataForMatching.ride_request_id} published to matching queue.`);
      return res.status(202).json({
        success: true,
        message: 'Ride request accepted. Searching for driver.',
        data: {
          rideRequestId: rideRequestDataForMatching.ride_request_id,
          status: 'PENDING_MATCHING',
          pickup: rideRequestDataForMatching.pickup_location,
          dropoff: rideRequestDataForMatching.dropoff_location,
          fare: rideRequestDataForMatching.fare
        }
      });
    } catch (error: any) {
      // ... (General error handling) ...
      console.error('❌ Create ride request error:', error);
      await this.logAndPublish('ride.request_error', {
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getMyTrips = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const {
        status,
        limit = '100',
        offset = '0',
        include_cancelled = 'false',
      } = req.query;

      const trips = await riderTripService.getTripHistory(riderId, {
        status: status as 'completed' | 'cancelled',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        includeCancelled: include_cancelled === 'true',
      });

      // Publish trips view event
      await this.logAndPublish('rider.trips_viewed', {
        rider_id: riderId,
        status_filter: status,
        trip_count: trips.trips.length,
        total_trips: trips.pagination.total,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: trips,
      });
    } catch (error: any) {
      console.error('Get rider trips error:', error);

      // Publish trips error event
      await this.logAndPublish('rider.trips_error', {
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trips',
      });
    }
  };

  /**
   * Get trip statistics for the authenticated rider
   */
  static getTripStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Get completed trips
      const completedTrips = await riderTripService.getTripHistory(riderId, {
        status: 'completed',
        limit: 1000,
      });

      // Get all trips including cancelled
      const allTrips = await riderTripService.getTripHistory(riderId, {
        includeCancelled: true,
        limit: 1000,
      });

      // Filter cancelled trips
      const cancelledTrips = allTrips.trips.filter(trip =>
        trip.status === 'cancelled'
      );

      // Calculate total spent (sum of actual_fare from completed trips)
      const totalSpent = completedTrips.trips.reduce((sum, trip) =>
        sum + (trip.actual_fare || trip.estimated_fare || 0), 0
      );

      // Calculate average rating (if driver_rating is available)
      const completedTripsWithRating = completedTrips.trips.filter(trip =>
        trip.driver_rating
      );
      const averageDriverRating = completedTripsWithRating.length > 0
        ? completedTripsWithRating.reduce((sum, trip) =>
          sum + (trip.driver_rating || 0), 0) / completedTripsWithRating.length
        : 0;

      const statistics = {
        total_trips: completedTrips.trips.length + cancelledTrips.length,
        completed_trips: completedTrips.trips.length,
        cancelled_trips: cancelledTrips.length,
        total_spent: totalSpent,
        average_driver_rating: parseFloat(averageDriverRating.toFixed(1)),
        most_used_vehicle_type: this.getMostUsedVehicleType(completedTrips.trips),
        total_distance_km: this.getTotalDistance(completedTrips.trips),
      };

      // Publish statistics view event
      await this.logAndPublish('rider.trip_statistics_viewed', {
        rider_id: riderId,
        total_trips: statistics.total_trips,
        total_spent: statistics.total_spent,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: {
          rider_id: riderId,
          statistics,
          summary: {
            last_trip_date: completedTrips.trips[0]?.completed_at || null,
            first_trip_date: completedTrips.trips[completedTrips.trips.length - 1]?.completed_at || null,
          }
        },
      });
    } catch (error: any) {
      console.error('Get trip statistics error:', error);

      // Publish statistics error event
      await this.logAndPublish('rider.trip_statistics_error', {
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trip statistics',
      });
    }
  };

  /**
   * Get specific trip details for the authenticated rider
   */
  static getTripDetails = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { tripId } = req.params;

      const trip = await riderTripService.getTripById(tripId);

      // Note: You might want to add validation here to ensure the trip belongs to this rider
      // This depends on your trip service implementation

      // Publish trip details view event
      await this.logAndPublish('rider.trip_details_viewed', {
        rider_id: riderId,
        trip_id: tripId,
        trip_status: trip.status,
        fare: trip.actual_fare || trip.estimated_fare,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: {
          trip: trip,
        },
      });
    } catch (error: any) {
      console.error('Get trip details error:', error);

      // Publish trip details error event
      await this.logAndPublish('rider.trip_details_error', {
        rider_id: req.rider?.riderId,
        trip_id: req.params.tripId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      if (error.message.includes('Trip not found') || error.message.includes('404')) {
        return res.status(404).json({
          success: false,
          error: 'Trip not found',
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trip details',
      });
    }
  };

  /**
   * Get rider's recent trips (last 10)
   */
  static getRecentTrips = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const trips = await riderTripService.getTripHistory(riderId, {
        limit: 10,
        offset: 0,
      });

      // Publish recent trips view event
      await this.logAndPublish('rider.recent_trips_viewed', {
        rider_id: riderId,
        trip_count: trips.trips.length,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: {
          trips: trips.trips,
          has_more: trips.pagination.has_more,
        },
      });
    } catch (error: any) {
      console.error('Get recent trips error:', error);

      // Publish recent trips error event
      await this.logAndPublish('rider.recent_trips_error', {
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch recent trips',
      });
    }
  };

  /**
   * Get rider dashboard with trip summary
   */
  static getDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const riderId = req.rider?.riderId;
      if (!riderId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Get data in parallel
      const [recentTrips, tripStats] = await Promise.all([
        riderTripService.getTripHistory(riderId, { limit: 5 }),
        this.getTripStatisticsForDashboard(riderId),
      ]);

      const dashboard = {
        rider_id: riderId,
        recent_trips: recentTrips.trips,
        statistics: tripStats,
        upcoming_features: {
          scheduled_rides: 0,
          favorite_drivers: 0,
          saved_locations: 0,
        }
      };

      // Publish dashboard view event
      await this.logAndPublish('rider.dashboard_viewed', {
        rider_id: riderId,
        recent_trip_count: recentTrips.trips.length,
        total_trips: tripStats.total_trips,
        total_spent: tripStats.total_spent,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);

      // Publish dashboard error event
      await this.logAndPublish('rider.dashboard_error', {
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to load dashboard',
      });
    }
  };

  static getActiveRideDetails = async (req: AuthRequest, res: Response) => {
    try {
      const { rideRequestId } = req.params;
      const riderId = req.rider?.riderId;

      if (!riderId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // 1. Get trip from trip-service using your existing client
      let trip;
      try {
        trip = await riderTripService.getTripByRideRequestId(rideRequestId);
      } catch (err: any) {
        if (err.response?.status === 404 || err.message?.includes('not found')) {
          // No trip yet → driver not assigned / still matching
          return res.status(200).json({
            success: true,
            data: {
              rideRequestId,
              status: 'SEARCHING',          // or 'REQUESTED' / 'PENDING_MATCHING' / 'NO_DRIVER_FOUND'
              driverInfo: null,
              pickupLocation: null,         // ← ideally fetch from Redis if you stored original request
              dropoffLocation: null,
              fareEstimate: null,
              vehicleType: null,
              message: 'Still searching for a driver...',

            }
          });
        }
        throw err;
      }
      const responseData = {
        rideRequestId,
        status: trip.status || 'ACTIVE',
        driverInfo: trip.driver
          ? {
            id: trip.driver.id,
            name: trip.driver.name || `${trip.driver.firstName || ''} ${trip.driver.lastName || ''}`.trim(),
            phone: trip.driver.phone,
            rating: trip.driver.rating || 4.8,
            photoUrl: trip.driver.photoUrl || trip.driver.profilePicture,
            // vehicle info usually lives here or in trip.vehicle
          }
          : null,
        vehicleInfo: trip.vehicle
          ? {
            type: trip.vehicle.type || trip.vehicle_type || 'standard',
            model: trip.vehicle.model,
            color: trip.vehicle.color,
            plate: trip.vehicle.plate || trip.vehicle.licensePlate,
            photoUrl: trip.vehicle.photoUrl,
          }
          : null,
        pickupLocation: trip.pickup || trip.pickup_location || { lat: null, lng: null, address: null },
        dropoffLocation: trip.dropoff || trip.dropoff_location || { lat: null, lng: null, address: null },
        fareEstimate: trip.estimated_fare || trip.fare || trip.estimatedFare,
        actualFare: trip.actual_fare || null,
        // Bonus fields that are very useful for active ride UI:
        etaMinutes: trip.eta?.minutesToPickup || trip.etaToPickup || null,
        distanceLeftKm: trip.distance?.remaining || null,
        currentDriverLocation: trip.driver?.currentLocation || null, // { lat, lng }
        startedAt: trip.started_at || trip.startedAt,
        // You can add surgeMultiplier, paymentMethodUsed, etc. if relevant
      };

      // Optional: publish analytics event
      await this.logAndPublish('ride.active_details_viewed', {
        rider_id: riderId,
        ride_request_id: rideRequestId,
        trip_id: trip.id || trip.tripId,
        status: trip.status,
        ip: req.ip,
      });

      return res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error: any) {
      console.error('getActiveRideDetails error:', error);
      await this.logAndPublish('ride.active_details_error', {
        rideRequestId: req.params.rideRequestId,
        rider_id: req.rider?.riderId,
        error: error.message,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch active ride details'
      });
    }
  };



  // Helper method for dashboard statistics
  private static async getTripStatisticsForDashboard(riderId: string): Promise<any> {
    try {
      const completedTrips = await riderTripService.getTripHistory(riderId, {
        status: 'completed',
        limit: 1000,
      });

      const totalSpent = completedTrips.trips.reduce((sum, trip) =>
        sum + (trip.actual_fare || trip.estimated_fare || 0), 0
      );

      const totalDistance = completedTrips.trips.reduce((sum, trip) =>
        sum + (trip.distance_km || 0), 0
      );

      return {
        total_trips: completedTrips.pagination.total,
        completed_trips: completedTrips.trips.length,
        total_spent: totalSpent,
        total_distance_km: totalDistance,
        average_trip_cost: completedTrips.trips.length > 0
          ? totalSpent / completedTrips.trips.length
          : 0,
      };
    } catch (error) {
      console.error('Error getting trip statistics for dashboard:', error);
      return {
        total_trips: 0,
        completed_trips: 0,
        total_spent: 0,
        total_distance_km: 0,
        average_trip_cost: 0,
      };
    }
  }

  // Helper method to get most used vehicle type
  private static getMostUsedVehicleType(trips: any[]): string {
    const vehicleCounts: Record<string, number> = {};

    trips.forEach(trip => {
      const vehicleType = trip.vehicle_model || 'Standard';
      vehicleCounts[vehicleType] = (vehicleCounts[vehicleType] || 0) + 1;
    });

    let mostUsed = 'Standard';
    let maxCount = 0;

    for (const [vehicleType, count] of Object.entries(vehicleCounts)) {
      if (count > maxCount) {
        mostUsed = vehicleType;
        maxCount = count;
      }
    }

    return mostUsed;
  }

  // Helper method to get total distance
  private static getTotalDistance(trips: any[]): number {
    return trips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0);
  }
}


