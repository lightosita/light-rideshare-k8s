
export class EmailServiceClient {
  private static emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3002';

  static async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
      
      const response = await fetch(`${this.emailServiceUrl}/api/v1/email/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Verify Your Email - SwiftRide',
          verificationUrl: verificationUrl,
          token: token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status: ${response.status}`);
      }

      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
      
      const response = await fetch(`${this.emailServiceUrl}/api/v1/email/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Reset Your Password - SwiftRide',
          resetUrl: resetUrl,
          token: token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status: ${response.status}`);
      }

      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }
}