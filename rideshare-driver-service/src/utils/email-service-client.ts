export class EmailServiceClient {

private static emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:3002';

  static async sendVerificationEmail(email: string, token: string, firstName: string): Promise<boolean> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/driver/verify-email?token=${token}`;
      
      const response = await fetch(`${this.emailServiceUrl}/api/v1/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Verify Your Driver Account - SwiftRide',
          verificationUrl: verificationUrl,
          token: token,
        }),
      });

      return await this.handleResponse(response, 'verification');
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/driver/reset-password?token=${token}`;
      
      const response = await fetch(`${this.emailServiceUrl}/api/v1/email/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Reset Your Driver Password - SwiftRide',
          resetUrl: resetUrl,
          token: token,
        }),
      });

      return await this.handleResponse(response, 'password reset');
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.emailServiceUrl}/api/v1/email/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private static async handleResponse(response: Response, type: string): Promise<boolean> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email service error (${type}): ${response.status} - ${errorText}`);
      return false;
    }
    console.log(`✅ Driver ${type} email sent successfully.`);
    return true;
  }
}