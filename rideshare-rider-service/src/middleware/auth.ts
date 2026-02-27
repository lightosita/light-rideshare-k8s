// src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth';

// THIS IS THE ONLY THING YOU NEED TO CHANGE
export interface RiderAuth {
  riderId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  rating?: number;
}

export interface AuthRequest extends Request {
  rider?: RiderAuth;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = AuthUtils.verifyToken(token);

    // NOW WE ATTACH THE FULL RIDER INFO
    req.rider = {
      riderId: decoded.riderId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      phone: decoded.phone,
      rating: decoded.rating || 4.8,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};