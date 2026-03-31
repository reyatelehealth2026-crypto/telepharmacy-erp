import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly sender: string;

  constructor(private readonly configService: ConfigService) {
    const smsConfig = this.configService.get('telemedicine.sms');
    this.apiKey = smsConfig?.apiKey || '';
    this.sender = smsConfig?.sender || 'Telepharmacy';
  }

  /**
   * Send SMS via ThaiSMS API
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // TODO: Integrate with ThaiSMS API
      // For now, log the message
      
      // In production:
      // const response = await axios.post('https://api.thaisms.com/v1/send', {
      //   apiKey: this.apiKey,
      //   sender: this.sender,
      //   to: phoneNumber,
      //   message: message,
      // });
      //
      // return response.data.success;

      this.logger.log(`[MOCK] Sending SMS to ${phoneNumber}: ${message}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const message = `รหัส OTP สำหรับยืนยันตัวตน: ${otp}\nใช้ได้ภายใน 5 นาที\n- LINE Telepharmacy`;
    return this.sendSms(phoneNumber, message);
  }
}
