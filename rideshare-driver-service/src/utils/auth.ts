
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export interface TokenPayload {
  driverId: string;
  email: string;
}

export class AuthUtils {
  static generateToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }

  static verifyToken(token: string): TokenPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.verify(token, secret) as TokenPayload;
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateRandomToken(length: number = 32): string {
    return require('crypto').randomBytes(length).toString('hex');
  }
}