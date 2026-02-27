import { Request, Response } from 'express';
import { DriverRepository } from '../models/Driver';
import { AuthUtils } from '../utils/auth'; 
import { EmailServiceClient } from '../utils/email-service-client';
import { redis } from '../config/redis';
import { AuthRequest } from '../middleware/auth';
import {
  driverRegisterSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateAvailabilitySchema,
  updateLocationSchema
} from '../utils/validation';
import { tripServiceClient } from '../utils/tripServiceClient';


export class DriverController {

  private static async logAndPublish(channel: string, data: any): Promise<void> {
    const eventData = {
      event: channel,
      timestamp: new Date().toISOString(),
      data
    };

    console.log(`📤 REDIS PUBLISH [${channel}]:`, JSON.stringify(eventData, null, 2));

    try {
      await redis.publish(channel, JSON.stringify(eventData));
      console.log(`✅ REDIS PUBLISH SUCCESS [${channel}]`);
    } catch (error) {
      console.error(`❌ REDIS PUBLISH FAILED [${channel}]:`, error);
      throw error;
    }
  }

  static register = async (req: Request, res: Response) => {
    try {
      const { error, value } = driverRegisterSchema.validate(req.body);
      if (error) {
        console.log('❌ DRIVER VALIDATION FAILED:');
        console.log('Error details:', JSON.stringify(error.details, null, 2));
        console.log('Error message:', error.message);

        // Publish driver registration validation error
        await this.logAndPublish('driver.registration_validation_error', {
          error: error.details[0].message,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        licenseNumber,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        vehiclePlate
      } = value;

      // Check if driver already exists
      const existingDriver = await DriverRepository.findByEmail(email);
      if (existingDriver) {
        console.log('❌ Driver already exists with email:', email);

        // Publish duplicate driver registration attempt
        await this.logAndPublish('driver.registration_duplicate', {
          email: email,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(409).json({
          success: false,
          error: 'Driver already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);
      const verificationToken = AuthUtils.generateRandomToken();

      // Create driver
      const driver = await DriverRepository.create({
        firstName,
        lastName,
        email,
        phone: `+234${phoneNumber}`,
        passwordHash: hashedPassword,
        licenseNumber,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        licensePlate: vehiclePlate,
        verificationToken
      });

      // Publish verification email sent event
      await this.logAndPublish('driver.verification_email_sent', {
        driver_id: driver.id,
        email: driver.email
      });

      EmailServiceClient.sendVerificationEmail(email, verificationToken, firstName)
        .then(success => {
          if (success) {
            console.log(`✅ Driver verification email sent to ${email}`);
          } else {
            console.log(`⚠️ Failed to send driver verification email to ${email}`);
          }
        })
        .catch(err => {
          console.error(`❌ Error sending driver verification email:`, err);
        });

      const token = AuthUtils.generateToken({
        driverId: driver.id,
        email: driver.email,
      });

      // Publish driver registered event
      await this.logAndPublish('driver.registered', {
        driver_id: driver.id,
        email: driver.email,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone,
        license_number: driver.licenseNumber,
        vehicle_type: driver.vehicleType,
        vehicle_make: driver.vehicleMake,
        vehicle_model: driver.vehicleModel,
        vehicle_year: driver.vehicleYear,
        license_plate: driver.licensePlate,
        registered_at: new Date().toISOString(),
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleYear: driver.vehicleYear,
            licensePlate: driver.licensePlate,
            isVerified: driver.isVerified,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            totalTrips: driver.totalTrips,
          },
          token
        }
      });

    } catch (error: any) {
      console.error('Driver registration error:', error);

      // Publish driver registration error event
      await this.logAndPublish('driver.registration_error', {
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        // Publish driver login validation error
        await this.logAndPublish('driver.login_validation_error', {
          error: error.details[0].message,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { email, password } = value;

      const driver = await DriverRepository.findByEmail(email);
      if (!driver) {
        // Publish failed driver login attempt
        await this.logAndPublish('driver.login_failed', {
          email: email,
          reason: 'driver_not_found',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      if (!driver.isActive) {
        // Publish login attempt to deactivated driver account
        await this.logAndPublish('driver.login_failed', {
          driver_id: driver.id,
          email: driver.email,
          reason: 'account_deactivated',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(401).json({
          success: false,
          error: 'Account is deactivated. Please contact support.'
        });
      }

      // Check if email is verified
      if (!driver.isVerified) {
        // Publish login attempt with unverified email
        await this.logAndPublish('driver.login_failed', {
          driver_id: driver.id,
          email: driver.email,
          reason: 'email_not_verified',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(403).json({
          success: false,
          error: 'Email not verified. Please verify your email before logging in.'
        });
      }

      const isPasswordValid = await AuthUtils.comparePassword(password, driver.passwordHash);
      if (!isPasswordValid) {
        // Publish failed login attempt (invalid password)
        await this.logAndPublish('driver.login_failed', {
          driver_id: driver.id,
          email: driver.email,
          reason: 'invalid_password',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      await DriverRepository.updateLastLogin(driver.id);

      const token = AuthUtils.generateToken({
        driverId: driver.id,
        email: driver.email,
      });

      // Publish successful driver login event
      await this.logAndPublish('driver.logged_in', {
        driver_id: driver.id,
        email: driver.email,
        name: `${driver.firstName} ${driver.lastName}`,
        login_time: new Date().toISOString(),
        user_agent: req.headers['user-agent'],
        ip_address: req.ip,
        vehicle_type: driver.vehicleType,
        is_available: driver.isAvailable
      });

      res.json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleYear: driver.vehicleYear,
            licensePlate: driver.licensePlate,
            isVerified: driver.isVerified,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            totalTrips: driver.totalTrips,
          },
          token
        }
      });

    } catch (error: any) {
      console.error('Driver login error:', error);

      // Publish driver login error event
      await this.logAndPublish('driver.login_error', {
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
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

      const driver = await DriverRepository.findByVerificationToken(token);
      if (!driver) {
        // Publish invalid verification token attempt
        await this.logAndPublish('driver.verification_failed', {
          reason: 'invalid_token',
          token: token
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid verification token'
        });
      }

      if (driver.isVerified) {
        // Publish already verified attempt
        await this.logAndPublish('driver.verification_failed', {
          driver_id: driver.id,
          email: driver.email,
          reason: 'already_verified'
        });

        return res.status(400).json({
          success: false,
          error: 'Email already verified'
        });
      }

      const updatedDriver = await DriverRepository.updateVerification(driver.id, true);

      await this.logAndPublish('driver.verified', {
        driver_id: updatedDriver.id,
        email: updatedDriver.email,
        verified_at: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          driver: {
            id: updatedDriver.id,
            firstName: updatedDriver.firstName,
            lastName: updatedDriver.lastName,
            email: updatedDriver.email,
            phone: updatedDriver.phone,
            isVerified: updatedDriver.isVerified,
          }
        }
      });

    } catch (error: any) {
      console.error('Driver email verification error:', error);

      // Publish driver verification error event
      await this.logAndPublish('driver.verification_error', {
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

      const driver = await DriverRepository.findByEmail(email);
      if (!driver) {
        // Don't reveal whether email exists, but still publish event
        await this.logAndPublish('driver.forgot_password_requested', {
          email: email,
          status: 'email_not_found',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.json({
          success: true,
          data: { message: 'If the email exists, a password reset link has been sent' }
        });
      }

      const resetToken = AuthUtils.generateRandomToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await DriverRepository.updateResetToken(driver.id, resetToken, resetTokenExpiry);

      // Publish reset email sent event
      await this.logAndPublish('driver.password_reset_email_sent', {
        driver_id: driver.id,
        email: driver.email
      });

      EmailServiceClient.sendPasswordResetEmail(email, resetToken, driver.firstName)
        .then(success => {
          if (success) {
            console.log(`✅ Driver password reset email sent to ${email}`);
          } else {
            console.log(`⚠️ Failed to send driver password reset email to ${email}`);
          }
        })
        .catch(err => {
          console.error(`❌ Error sending driver password reset email:`, err);
        });

      await this.logAndPublish('driver.forgot_password', {
        driver_id: driver.id,
        email: driver.email,
        reset_token_created: new Date().toISOString(),
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: { message: 'If the email exists, a password reset link has been sent' }
      });

    } catch (error: any) {
      console.error('Driver forgot password error:', error);

      // Publish driver forgot password error event
      await this.logAndPublish('driver.forgot_password_error', {
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static resetPassword = async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { token, password } = value;

      const driver = await DriverRepository.findByResetToken(token);
      if (!driver) {
        // Publish invalid reset token attempt
        await this.logAndPublish('driver.password_reset_failed', {
          reason: 'invalid_token',
          token: token,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      const hashedPassword = await AuthUtils.hashPassword(password);
      const updatedDriver = await DriverRepository.updatePassword(driver.id, hashedPassword);

      await this.logAndPublish('driver.password_reset', {
        driver_id: updatedDriver.id,
        email: updatedDriver.email,
        reset_at: new Date().toISOString(),
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: { message: 'Password reset successfully' }
      });

    } catch (error: any) {
      console.error('Driver reset password error:', error);

      // Publish driver password reset error event
      await this.logAndPublish('driver.password_reset_error', {
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getCurrentDriver = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;

      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const driver = await DriverRepository.findById(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Driver not found'
        });
      }

      // Publish driver profile view event
      await this.logAndPublish('driver.profile_viewed', {
        driver_id: driver.id,
        email: driver.email,
        viewed_at: new Date().toISOString(),
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleYear: driver.vehicleYear,
            licensePlate: driver.licensePlate,
            isVerified: driver.isVerified,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            totalTrips: driver.totalTrips,
            createdAt: driver.createdAt,
          }
        }
      });

    } catch (error: any) {
      console.error('Get driver error:', error);

      // Publish driver profile view error event
      await this.logAndPublish('driver.profile_view_error', {
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getDriver = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const driver = await DriverRepository.findById(id);

      if (!driver) {
        await this.logAndPublish('driver.lookup_failed', {
          driver_id: id,
          reason: 'not_found',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(404).json({
          success: false,
          error: 'Driver not found'
        });
      }

      // Publish driver lookup event
      await this.logAndPublish('driver.looked_up', {
        driver_id: driver.id,
        email: driver.email,
        looked_up_by: req.ip,
        looked_up_at: new Date().toISOString(),
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleYear: driver.vehicleYear,
            licensePlate: driver.licensePlate,
            rating: driver.rating,
            totalTrips: driver.totalTrips,
            isAvailable: driver.isAvailable,
          }
        }
      });

    } catch (error: any) {
      console.error('Get driver error:', error);

      // Publish driver lookup error event
      await this.logAndPublish('driver.lookup_error', {
        driver_id: req.params.id,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

 static updateAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.driver?.driverId;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { error, value } = updateAvailabilitySchema.validate(req.body);
    if (error) {
      await this.logAndPublish('driver.availability_update_validation_error', {
        driver_id: driverId,
        error: error.details[0].message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { isAvailable } = value;

    const driver = await DriverRepository.updateAvailability(driverId, isAvailable);
    const currentLocation = await DriverRepository.getCurrentLocation(driver.id);

    console.log('Driver details from database:', {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      rating: driver.rating,
      vehicleType: driver.vehicleType,
      licensePlate: driver.licensePlate
    });

    if (driver.isAvailable && currentLocation) {
      await redis.publish('driver.location_updated', JSON.stringify({
        event: 'driver_location_update',
        driver_id: driverId,
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        vehicle_type: driver.vehicleType,
        name: `${driver.firstName} ${driver.lastName}`,
        rating: driver.rating || 5,
        license_plate: driver.licensePlate
      }));
      console.log(`Published driver_location_update for ${driverId} to Redis Pub/Sub`);
    }

    // IF GOING OFFLINE → tell Go service to remove driver
    if (!driver.isAvailable) {
      await redis.publish('driver_online_updates', JSON.stringify({
        event: 'driver_offline',
        driver_id: driverId
      }));
      console.log(`Published driver_offline for ${driverId}`);
    }

    await this.logAndPublish('driver.availability_changed', {
      driver_id: driver.id,
      is_available: driver.isAvailable,
      current_location: currentLocation || { latitude: 0, longitude: 0 },
      driver_info: {
        first_name: driver.firstName,
        last_name: driver.lastName,
        name: `${driver.firstName} ${driver.lastName}`,
        rating: driver.rating || 0,
        vehicle_type: driver.vehicleType || 'SEDAN',
        license_plate: driver.licensePlate || 'N/A',
        vehicle_make: driver.vehicleMake || '',
        vehicle_model: driver.vehicleModel || '',
        total_trips: driver.totalTrips || 0
      },
      updated_at: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    console.log('Successfully published driver availability event');

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          isAvailable: driver.isAvailable,
        }
      }
    });

  } catch (error: any) {
    console.error('Update availability error:', error);
    await this.logAndPublish('driver.availability_update_error', {
      driver_id: req.driver?.driverId,
      error: error.message,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

static updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.driver?.driverId;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { error, value } = updateLocationSchema.validate(req.body);
    if (error) {
      await this.logAndPublish('driver.location_update_validation_error', {
        driver_id: driverId,
        error: error.details[0].message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { latitude, longitude, heading, speedKmh } = value;

    const location = await DriverRepository.updateLocation({
      driverId,
      latitude,
      longitude,
      heading,
      speedKmh
    });

    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    // ONLY PUBLISH LOCATION UPDATE IF DRIVER IS CURRENTLY AVAILABLE
    if (driver.isAvailable) {
     await redis.publish('driver.location_updated', JSON.stringify({
        event: 'driver_location_update',
        driver_id: driverId,
        lat: latitude,
        lng: longitude,
        vehicle_type: driver.vehicleType,
        name: `${driver.firstName} ${driver.lastName}`,
        rating: driver.rating || 5,
        license_plate: driver.licensePlate
      }));
      console.log(`Location update published for available driver ${driverId}`);
    }

    await this.logAndPublish('driver.location_updated', {
      driver_id: driverId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed_kmh: location.speedKmh
      },
      is_available: driver.isAvailable,
      driver_info: driver ? {
        first_name: driver.firstName,
        last_name: driver.lastName,
        name: `${driver.firstName} ${driver.lastName}`,
        rating: driver.rating,
        vehicle_type: driver.vehicleType,
        license_plate: driver.licensePlate
      } : null,
      updated_at: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: { location }
    });

  } catch (error: any) {
    console.error('Update location error:', error);
    await this.logAndPublish('driver.location_update_error', {
      driver_id: req.driver?.driverId,
      error: error.message,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};


  static getAvailability = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const driver = await DriverRepository.findById(driverId);
      if (!driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      res.json({
        success: true,
        data: {
          isAvailable: driver.isAvailable
        }
      });

    } catch (error: any) {
      console.error('Get availability error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };


  static getCurrentLocation = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;

      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const location = await DriverRepository.getCurrentLocation(driverId);

      if (!location) {
        // Publish location not found event
        await this.logAndPublish('driver.location_retrieval_error', {
          driver_id: driverId,
          reason: 'no_location_data',
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(404).json({
          success: false,
          error: 'Location not found'
        });
      }

      // Publish location retrieval event
      await this.logAndPublish('driver.location_retrieved', {
        driver_id: driverId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        retrieved_at: new Date().toISOString(),
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: { location }
      });

    } catch (error: any) {
      console.error('Get location error:', error);

      // Publish location retrieval error event
      await this.logAndPublish('driver.location_retrieval_error', {
        driver_id: req.driver?.driverId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  static getDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { time_range = 'all' } = req.query;

      // Fetch data in parallel
      const [activeTrip, earningsSummary, recentTrips] = await Promise.all([
        tripServiceClient.getActiveTrip(driverId),
        tripServiceClient.getDriverEarningsSummary(driverId, time_range as string),
        tripServiceClient.getDriverTrips(driverId, { limit: 5 }),
      ]);

      const dashboard = {
        driver_id: driverId,
        active_trip: activeTrip,
        earnings: earningsSummary,
        recent_trips: recentTrips.trips || [],
        summary: {
          total_trips: recentTrips.pagination?.total || 0,
          total_earned: earningsSummary.statistics?.total_earned || 0,
          current_balance: earningsSummary.account?.current_balance || 0,
          average_rating: 0, // You might want to calculate this from trips
        },
      };

      // Publish dashboard view event
      await this.logAndPublish('driver.dashboard_viewed', {
        driver_id: driverId,
        viewed_at: new Date().toISOString(),
        has_active_trip: !!activeTrip,
        total_balance: earningsSummary.account?.current_balance || 0,
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
      await this.logAndPublish('driver.dashboard_error', {
        driver_id: req.driver?.driverId,
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

  /**
   * Get all trips for the authenticated driver
   */
  static getMyTrips = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
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

      const trips = await tripServiceClient.getDriverTrips(driverId, {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        includeCancelled: include_cancelled === 'true',
      });

      // Publish trips view event
      await this.logAndPublish('driver.trips_viewed', {
        driver_id: driverId,
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
      console.error('Get trips error:', error);

      // Publish trips error event
      await this.logAndPublish('driver.trips_error', {
        driver_id: req.driver?.driverId,
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
   * Get driver earnings and transactions
   */
  static getMyEarnings = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { time_range = 'all', limit = '10', offset = '0' } = req.query;

      const [earningsSummary, transactions] = await Promise.all([
        tripServiceClient.getDriverEarningsSummary(driverId, time_range as string),
        tripServiceClient.getDriverTransactions(driverId, {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        }),
      ]);

      // Publish earnings view event
      await this.logAndPublish('driver.earnings_viewed', {
        driver_id: driverId,
        time_range: time_range,
        total_earned: earningsSummary.statistics.total_earned,
        current_balance: earningsSummary.account.current_balance,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: {
          summary: earningsSummary,
          transactions: transactions,
        },
      });
    } catch (error: any) {
      console.error('Get earnings error:', error);

      // Publish earnings error event
      await this.logAndPublish('driver.earnings_error', {
        driver_id: req.driver?.driverId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch earnings',
      });
    }
  };


  /**
   * Get driver's completed trips
   */
  static getMyCompletedTrips = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { limit = '50', offset = '0' } = req.query;

      const completedTrips = await tripServiceClient.getCompletedTrips(driverId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      // Publish completed trips view event
      await this.logAndPublish('driver.completed_trips_viewed', {
        driver_id: driverId,
        trip_count: completedTrips.trips.length,
        total_completed: completedTrips.pagination.total,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: completedTrips,
      });
    } catch (error: any) {
      console.error('Get completed trips error:', error);

      // Publish completed trips error event
      await this.logAndPublish('driver.completed_trips_error', {
        driver_id: req.driver?.driverId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch completed trips',
      });
    }
  };

  /**
   * Get specific trip details
   */
  static getTripDetails = async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.driver?.driverId;
      if (!driverId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { tripId } = req.params;

      const trip = await tripServiceClient.getTripById(tripId);

      if (trip.driver_id !== driverId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this trip',
        });
      }

      // Publish trip details view event
      await this.logAndPublish('driver.trip_details_viewed', {
        driver_id: driverId,
        trip_id: tripId,
        trip_status: trip.status,
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
      await this.logAndPublish('driver.trip_details_error', {
        driver_id: req.driver?.driverId,
        trip_id: req.params.tripId,
        error: error.message,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trip details',
      });
    }
  };

static acceptRide = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.driver?.driverId;
    const { requestId } = req.params;

    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const trip = await tripServiceClient.acceptRideRequest(requestId, driverId);

    await this.logAndPublish('driver.ride_accepted', {
      driver_id: driverId,
      request_id: requestId,
      trip_id: trip.id,
      accepted_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { trip }
    });
  } catch (error: any) {
    console.error('Accept ride error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to accept ride request'
    });
  }
};

/**
 * Explicitly get the current active trip for the driver
 */
static getMyActiveTrip = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.driver?.driverId;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const activeTrip = await tripServiceClient.getActiveTrip(driverId);

    res.json({
      success: true,
      data: activeTrip || null // Return null if no trip is active
    });
  } catch (error: any) {
    console.error('Get active trip error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
}


