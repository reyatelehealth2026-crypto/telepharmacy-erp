import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generate email verification token (JWT with 24-hour expiry)
   */
  generateVerificationToken(verificationId: string, email: string): string {
    return this.jwtService.sign(
      { verificationId, email },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: '24h',
      }
    );
  }

  /**
   * Verify email verification token
   */
  verifyToken(token: string): { verificationId: string; email: string } | null {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });
      return {
        verificationId: payload.verificationId,
        email: payload.email,
      };
    } catch (error) {
      this.logger.error('Invalid or expired verification token:', error);
      return null;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    patientName: string
  ): Promise<boolean> {
    try {
      // TODO: Integrate with AWS SES or email service
      // For now, log the email
      
      const verificationUrl = `${this.configService.get('app.frontendUrl')}/verify-email?token=${verificationToken}`;
      
      const emailContent = {
        to: email,
        subject: 'ยืนยันอีเมลสำหรับบริการเภสัชกรรมทางไกล - LINE Telepharmacy',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>ยืนยันอีเมลของคุณ</h2>
            <p>สวัสดีคุณ ${patientName},</p>
            <p>กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมลของคุณสำหรับบริการเภสัชกรรมทางไกล:</p>
            <p style="margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                ยืนยันอีเมล
              </a>
            </p>
            <p>หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง<br>
              หากคุณไม่ได้ทำการสมัครใช้บริการ กรุณาเพิกเฉยอีเมลนี้
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              LINE Telepharmacy<br>
              เภสัชกรรมทางไกลที่คุณไว้วางใจ
            </p>
          </div>
        `,
      };

      // In production:
      // const ses = new SESClient({ region: 'ap-southeast-1' });
      // const command = new SendEmailCommand({
      //   Source: 'noreply@telepharmacy.com',
      //   Destination: { ToAddresses: [email] },
      //   Message: {
      //     Subject: { Data: emailContent.subject },
      //     Body: { Html: { Data: emailContent.html } },
      //   },
      // });
      // await ses.send(command);

      this.logger.log(`[MOCK] Sending verification email to ${email}`);
      this.logger.log(`Verification URL: ${verificationUrl}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }
}
