

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';


export interface JwtPayload {
  riderId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  rating?: number;
  iat?: number;
  exp?: number;
}

export class AuthUtils {
  private static JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

  private static getJwtOptions(): jwt.SignOptions {
    return {
      expiresIn: '7d'
    };
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // NOW THIS INCLUDES REAL NAME & PHONE
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, this.getJwtOptions());
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateVerificationToken(): string {
    return this.generateRandomToken(32);
  }

  static generateResetToken(): string {
    return this.generateRandomToken(32);
  }
}