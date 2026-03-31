import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MinioStorageService {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly documentsBucket: string;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('telemedicine.storage');
    this.documentsBucket = storageConfig?.documentsBucket || 'telemedicine-documents';
  }

  /**
   * Upload encrypted file to MinIO
   */
  async uploadEncrypted(
    buffer: Buffer,
    filename: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      // Encrypt the buffer
      const encryptedBuffer = this.encryptBuffer(buffer, encryptionKey);

      // TODO: Integrate with MinIO client
      // For now, return mock URL
      
      // In production:
      // const minioClient = new Minio.Client({
      //   endPoint: this.configService.get('minio.endpoint'),
      //   port: this.configService.get('minio.port'),
      //   useSSL: true,
      //   accessKey: this.configService.get('minio.accessKey'),
      //   secretKey: this.configService.get('minio.secretKey'),
      // });
      //
      // await minioClient.putObject(
      //   this.documentsBucket,
      //   filename,
      //   encryptedBuffer,
      //   encryptedBuffer.length,
      //   { 'Content-Type': 'application/octet-stream' }
      // );
      //
      // return `https://minio.telepharmacy.com/${this.documentsBucket}/${filename}`;

      const mockUrl = `https://minio.telepharmacy.com/${this.documentsBucket}/${filename}`;
      this.logger.log(`[MOCK] Uploaded encrypted file: ${mockUrl}`);
      
      return mockUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Download and decrypt file from MinIO
   */
  async downloadDecrypted(url: string, encryptionKey: string): Promise<Buffer> {
    try {
      // TODO: Integrate with MinIO client
      // For now, return mock buffer
      
      // In production:
      // const filename = url.split('/').pop();
      // const stream = await minioClient.getObject(this.documentsBucket, filename);
      // const chunks: Buffer[] = [];
      // for await (const chunk of stream) {
      //   chunks.push(chunk);
      // }
      // const encryptedBuffer = Buffer.concat(chunks);
      // return this.decryptBuffer(encryptedBuffer, encryptionKey);

      this.logger.log(`[MOCK] Downloaded and decrypted file from: ${url}`);
      return Buffer.from('mock-decrypted-data');
    } catch (error) {
      this.logger.error(`Failed to download file from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Encrypt buffer using AES-256-GCM
   */
  private encryptBuffer(buffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt buffer using AES-256-GCM
   */
  private decryptBuffer(encryptedBuffer: Buffer, key: string): Buffer {
    const algorithm = 'aes-256-gcm';
    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(16, 32);
    const encrypted = encryptedBuffer.subarray(32);

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Upload file to MinIO bucket with content type
   */
  async uploadFile(bucket: string, filename: string, buffer: Buffer, contentType?: string): Promise<string> {
    try {
      const mockUrl = `https://minio.telepharmacy.com/${bucket}/${filename}`;
      this.logger.log(`[MOCK] Uploaded file (${contentType || 'application/octet-stream'}): ${mockUrl}`);
      return mockUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to MinIO bucket (unencrypted)
   */
  async upload(bucket: string, filename: string, buffer: Buffer): Promise<string> {
    try {
      const mockUrl = `https://minio.telepharmacy.com/${bucket}/${filename}`;
      this.logger.log(`[MOCK] Uploaded file: ${mockUrl}`);
      return mockUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}-${timestamp}-${random}.${extension}`;
  }
}
