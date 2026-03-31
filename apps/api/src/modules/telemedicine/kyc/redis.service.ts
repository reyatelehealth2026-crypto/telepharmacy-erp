import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisKycService {
  private readonly logger = new Logger(RedisKycService.name);
  private readonly otpPrefix: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('telemedicine.redis');
    this.otpPrefix = redisConfig?.kycOtpPrefix || 'kyc:otp:';
  }

  /**
   * Store OTP in Redis with expiry
   */
  async storeOtp(verificationId: string, otp: string, expirySeconds: number): Promise<void> {
    const key = `${this.otpPrefix}${verificationId}`;
    await this.cacheManager.set(key, otp, expirySeconds * 1000); // Convert to milliseconds
    this.logger.log(`Stored OTP for verification ${verificationId}, expires in ${expirySeconds}s`);
  }

  /**
   * Get OTP from Redis
   */
  async getOtp(verificationId: string): Promise<string | null> {
    const key = `${this.otpPrefix}${verificationId}`;
    const otp = await this.cacheManager.get<string>(key);
    return otp || null;
  }

  /**
   * Delete OTP from Redis
   */
  async deleteOtp(verificationId: string): Promise<void> {
    const key = `${this.otpPrefix}${verificationId}`;
    await this.cacheManager.del(key);
    this.logger.log(`Deleted OTP for verification ${verificationId}`);
  }

  /**
   * Check if OTP exists
   */
  async otpExists(verificationId: string): Promise<boolean> {
    const otp = await this.getOtp(verificationId);
    return otp !== null;
  }
}
