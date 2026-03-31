import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import axios from 'axios';

export interface AgoraTokenOptions {
  channelName: string;
  uid: number;
  role: 'publisher' | 'subscriber';
}

export interface CloudRecordingConfig {
  channelName: string;
  uid: number;
  resourceId?: string;
}

export interface RecordingInfo {
  sid: string;
  resourceId: string;
  fileList: Array<{
    filename: string;
    trackType: string;
    uid: string;
    mixedAllUser: boolean;
    isPlayable: boolean;
    sliceStartTime: number;
  }>;
}

@Injectable()
export class AgoraService {
  private readonly appId: string;
  private readonly appCertificate: string;
  private readonly tokenExpirySeconds: number;
  private readonly apiBaseUrl = 'https://api.agora.io/v1/apps';

  constructor(private readonly config: ConfigService) {
    this.appId = config.getOrThrow<string>('telemedicine.agora.appId');
    this.appCertificate = config.getOrThrow<string>(
      'telemedicine.agora.appCertificate',
    );
    this.tokenExpirySeconds = config.get<number>(
      'telemedicine.agora.tokenExpirySeconds',
      86400,
    );
  }

  /**
   * Generate Agora RTC token with 24-hour expiry
   */
  generateToken(options: AgoraTokenOptions): string {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + this.tokenExpirySeconds;

    const role =
      options.role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      options.channelName,
      options.uid,
      role,
      privilegeExpiredTs,
      privilegeExpiredTs, // Token expiry timestamp
    );
  }

  /**
   * Acquire resource for cloud recording
   */
  async acquireRecordingResource(
    channelName: string,
    uid: number,
  ): Promise<string> {
    const url = `${this.apiBaseUrl}/${this.appId}/cloud_recording/acquire`;

    const response = await axios.post(
      url,
      {
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {
          resourceExpiredHour: 24,
          scene: 0, // Real-time communication
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getBasicAuth(),
        },
      },
    );

    return response.data.resourceId;
  }

  /**
   * Start cloud recording with Thailand storage (MinIO)
   */
  async startCloudRecording(
    config: CloudRecordingConfig,
  ): Promise<{ sid: string; resourceId: string }> {
    if (!config.resourceId) {
      config.resourceId = await this.acquireRecordingResource(
        config.channelName,
        config.uid,
      );
    }

    const url = `${this.apiBaseUrl}/${this.appId}/cloud_recording/resourceid/${config.resourceId}/mode/mix/start`;

    const minioConfig = {
      accessKey: this.config.get<string>('minio.accessKey'),
      secretKey: this.config.get<string>('minio.secretKey'),
      endpoint: this.config.get<string>('minio.endpoint'),
      bucket: this.config.get<string>(
        'telemedicine.storage.recordingsBucket',
        'telemedicine-recordings',
      ),
    };

    const response = await axios.post(
      url,
      {
        cname: config.channelName,
        uid: config.uid.toString(),
        clientRequest: {
          token: this.generateToken({
            channelName: config.channelName,
            uid: config.uid,
            role: 'publisher',
          }),
          recordingConfig: {
            channelType: 1, // Live broadcast
            streamTypes: 2, // Audio + Video
            maxIdleTime: 120, // Stop recording after 2 minutes of inactivity
            transcodingConfig: {
              width: 1280,
              height: 720,
              fps: 30,
              bitrate: 2000,
              mixedVideoLayout: 1, // Best fit layout
            },
          },
          storageConfig: {
            vendor: 0, // Custom storage (MinIO S3-compatible)
            region: 0,
            bucket: minioConfig.bucket,
            accessKey: minioConfig.accessKey,
            secretKey: minioConfig.secretKey,
            endpoint: minioConfig.endpoint,
            fileNamePrefix: [
              'recordings',
              config.channelName,
              new Date().toISOString().split('T')[0],
            ],
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getBasicAuth(),
        },
      },
    );

    return {
      sid: response.data.sid,
      resourceId: config.resourceId,
    };
  }

  /**
   * Stop cloud recording and get file info
   */
  async stopCloudRecording(
    channelName: string,
    resourceId: string,
    sid: string,
    uid: number,
  ): Promise<RecordingInfo> {
    const url = `${this.apiBaseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;

    const response = await axios.post(
      url,
      {
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getBasicAuth(),
        },
      },
    );

    return {
      sid,
      resourceId,
      fileList: response.data.serverResponse?.fileList || [],
    };
  }

  /**
   * Query recording status
   */
  async queryRecordingStatus(
    resourceId: string,
    sid: string,
  ): Promise<{ status: string; fileList: any[] }> {
    const url = `${this.apiBaseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getBasicAuth(),
      },
    });

    return {
      status: response.data.serverResponse?.status || 'unknown',
      fileList: response.data.serverResponse?.fileList || [],
    };
  }

  /**
   * Generate basic auth header for Agora API
   */
  private getBasicAuth(): string {
    const credentials = Buffer.from(
      `${this.appId}:${this.appCertificate}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Generate unique channel name for consultation
   */
  generateChannelName(consultationId: string): string {
    return `consultation-${consultationId}`;
  }

  /**
   * Generate unique UID for user
   */
  generateUid(userId: string): number {
    // Convert UUID to number (use first 8 chars as hex)
    const hex = userId.replace(/-/g, '').substring(0, 8);
    return parseInt(hex, 16) % 2147483647; // Max 32-bit signed int
  }
}
