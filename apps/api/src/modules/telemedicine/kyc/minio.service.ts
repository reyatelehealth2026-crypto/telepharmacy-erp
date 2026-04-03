import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';

@Injectable()
export class MinioStorageService {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly documentsBucket: string;
  private readonly client: Minio.Client;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('telemedicine.storage');
    this.documentsBucket = storageConfig?.documentsBucket || 'telemedicine-documents';

    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    this.port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
    this.useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin';
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL') ||
      `http://${this.endpoint}:${this.port}`;

    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
    });

    this.ensureBucketsExist();
  }

  private async ensureBucketsExist(): Promise<void> {
    const buckets = [this.documentsBucket, 'prescriptions', 'telepharmacy'];
    for (const bucket of buckets) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          try {
            await this.client.makeBucket(bucket, 'us-east-1');
          } catch (mkErr: any) {
            if (mkErr?.code !== 'BucketAlreadyOwnedByYou') throw mkErr;
          }
          // Set public read policy
          const policy = JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            }],
          });
          await this.client.setBucketPolicy(bucket, policy);
          this.logger.log(`Created bucket: ${bucket}`);
        }
      } catch (err) {
        this.logger.error(`Failed to ensure bucket ${bucket}:`, err);
      }
    }
  }

  async upload(bucket: string, filename: string, buffer: Buffer, contentType?: string): Promise<string> {
    try {
      await this.client.putObject(
        bucket,
        filename,
        buffer,
        buffer.length,
        { 'Content-Type': contentType || 'application/octet-stream' }
      );
      const url = `${this.publicUrl}/${bucket}/${filename}`;
      this.logger.log(`Uploaded: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload ${filename}:`, error);
      throw error;
    }
  }

  async uploadFile(bucket: string, filename: string, buffer: Buffer, contentType?: string): Promise<string> {
    return this.upload(bucket, filename, buffer, contentType);
  }

  async uploadEncrypted(buffer: Buffer, filename: string, encryptionKey: string): Promise<string> {
    const encryptedBuffer = this.encryptBuffer(buffer, encryptionKey);
    return this.upload(this.documentsBucket, filename, encryptedBuffer, 'application/octet-stream');
  }

  async downloadDecrypted(url: string, encryptionKey: string): Promise<Buffer> {
    try {
      const parts = url.replace(this.publicUrl + '/', '').split('/');
      const bucket = parts[0];
      const filename = parts.slice(1).join('/');
      const stream = await this.client.getObject(bucket, filename);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const encryptedBuffer = Buffer.concat(chunks);
      return this.decryptBuffer(encryptedBuffer, encryptionKey);
    } catch (error) {
      this.logger.error(`Failed to download ${url}:`, error);
      throw error;
    }
  }

  private encryptBuffer(buffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decryptBuffer(encryptedBuffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(16, 32);
    const encrypted = encryptedBuffer.subarray(32);
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  generateFilename(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}-${timestamp}-${random}.${extension}`;
  }
}
