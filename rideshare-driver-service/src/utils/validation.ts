// utils/validation.ts
import Joi from 'joi';

export const driverRegisterSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'First name is required',
    'string.max': 'First name must be less than 100 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Last name is required',
    'string.max': 'Last name must be less than 100 characters',
    'any.required': 'Last name is required',
  }),
  phoneNumber: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Phone number must be a valid 10-digit Nigerian number (e.g., 8012345678)',
    'any.required': 'Phone number is required',
  }),
  licenseNumber: Joi.string().min(1).required().messages({
    'string.min': 'License number is required',
    'any.required': 'License number is required',
  }),
  vehicleType: Joi.string().valid('SEDAN', 'SUV', 'VAN', 'LUXURY', 'ELECTRIC').required().messages({
    'any.only': 'Vehicle type must be one of: SEDAN, SUV, VAN, LUXURY, ELECTRIC',
    'any.required': 'Vehicle type is required',
  }),
  vehicleMake: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Vehicle make is required',
    'string.max': 'Vehicle make must be less than 100 characters',
    'any.required': 'Vehicle make is required',
  }),
  vehicleModel: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Vehicle model is required',
    'string.max': 'Vehicle model must be less than 100 characters',
    'any.required': 'Vehicle model is required',
  }),
  vehicleYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).required().messages({
    'number.min': 'Vehicle year must be after 1900',
    'number.max': `Vehicle year cannot be in the future`,
    'any.required': 'Vehicle year is required',
  }),
  vehiclePlate: Joi.string().min(1).max(20).required().messages({
    'string.min': 'License plate is required',
    'string.max': 'License plate must be less than 20 characters',
    'any.required': 'License plate is required',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token is required',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
});

export const updateAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required().messages({
    'any.required': 'Availability status is required',
  }),
});

export const updateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
    'any.required': 'Latitude is required',
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
    'any.required': 'Longitude is required',
  }),
  heading: Joi.number().min(0).max(360).optional().messages({
    'number.min': 'Heading must be between 0 and 360 degrees',
    'number.max': 'Heading must be between 0 and 360 degrees',
  }),
  speedKmh: Joi.number().min(0).optional().messages({
    'number.min': 'Speed cannot be negative',
  }),
});