// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth';

export interface AuthRequest extends Request {
  driver?: {
    driverId: string;
    email: string;
  };
}

export const authenticateDriver = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = AuthUtils.verifyToken(token);
      req.driver = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};