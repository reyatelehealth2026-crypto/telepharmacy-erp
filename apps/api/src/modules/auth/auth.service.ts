import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { staff, patients } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { TokenType } from './auth.constants';
import type { JwtPayload, RequestUser } from './interfaces';
import type { LineLoginDto } from './dto/line-login.dto';
import type { StaffLoginDto } from './dto/staff-login.dto';
import type { PdpaConsentDto } from './dto/pdpa-consent.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async lineLogin(dto: LineLoginDto) {
    const lineProfile = await this.exchangeLineCode(dto.code, dto.redirectUri);

    let [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.lineUserId, lineProfile.userId))
      .limit(1);

    let isRegistered = true;

    if (!patient) {
      isRegistered = false;
      const patientNo = await this.generatePatientNo();
      [patient] = await this.db
        .insert(patients)
        .values({
          lineUserId: lineProfile.userId,
          patientNo,
          firstName: lineProfile.displayName ?? 'ผู้ใช้',
          lastName: '',
          province: '',
          lineLinkedAt: new Date(),
        })
        .returning();
    }

    const tokens = await this.generatePatientTokens(patient);

    return {
      ...tokens,
      tokenType: 'Bearer',
      patient: {
        id: patient.id,
        patientNo: patient.patientNo,
        firstName: patient.firstName,
        lastName: patient.lastName,
        isRegistered,
      },
    };
  }

  async staffLogin(dto: StaffLoginDto) {
    const [staffMember] = await this.db
      .select()
      .from(staff)
      .where(eq(staff.email, dto.email.toLowerCase()))
      .limit(1);

    if (!staffMember) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!staffMember.isActive) {
      throw new UnauthorizedException('บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      staffMember.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    await this.db
      .update(staff)
      .set({ lastLoginAt: new Date() })
      .where(eq(staff.id, staffMember.id));

    const tokens = await this.generateStaffTokens(staffMember);

    return {
      ...tokens,
      tokenType: 'Bearer',
      staff: {
        id: staffMember.id,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        role: staffMember.role,
        licenseNo: staffMember.licenseNo,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });

      const expiresInSec = this.getExpirySeconds(
        this.config.get<string>('jwt.expiry') ?? '1h',
      );

      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          type: payload.type,
          role: payload.role,
          lineUserId: payload.lineUserId,
        } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>('jwt.secret'),
          expiresIn: expiresInSec,
        },
      );

      return {
        accessToken: newAccessToken,
        expiresIn: expiresInSec,
      };
    } catch {
      throw new UnauthorizedException('Refresh token ไม่ถูกต้องหรือหมดอายุ');
    }
  }

  async pdpaConsent(userId: string, dto: PdpaConsentDto) {
    const now = new Date();

    const [updated] = await this.db
      .update(patients)
      .set({
        pdpaConsentAt: now,
        pdpaVersion: dto.version,
        dataSharingOpt: dto.dataSharingOpt,
        updatedAt: now,
      })
      .where(eq(patients.id, userId))
      .returning({
        pdpaConsentAt: patients.pdpaConsentAt,
        pdpaVersion: patients.pdpaVersion,
      });

    if (!updated) {
      throw new ConflictException('ไม่พบข้อมูลผู้ป่วย');
    }

    return {
      consentedAt: updated.pdpaConsentAt?.toISOString(),
      version: updated.pdpaVersion,
    };
  }

  async getProfile(user: RequestUser) {
    if (user.type === TokenType.PATIENT) {
      const [patient] = await this.db
        .select()
        .from(patients)
        .where(eq(patients.id, user.id))
        .limit(1);
      if (!patient) throw new UnauthorizedException('ไม่พบข้อมูลผู้ป่วย');
      return { type: TokenType.PATIENT, ...patient };
    }

    const [staffMember] = await this.db
      .select({
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        licenseNo: staff.licenseNo,
        avatarUrl: staff.avatarUrl,
      })
      .from(staff)
      .where(eq(staff.id, user.id))
      .limit(1);
    if (!staffMember) throw new UnauthorizedException('ไม่พบข้อมูลพนักงาน');
    return { type: TokenType.STAFF, ...staffMember };
  }

  private async generatePatientTokens(patient: any) {
    const payload: JwtPayload = {
      sub: patient.id,
      type: TokenType.PATIENT,
      lineUserId: patient.lineUserId,
    };

    const expiresInSec = this.getExpirySeconds(
      this.config.get<string>('jwt.expiry') ?? '1h',
    );
    const refreshExpiresInSec = this.getExpirySeconds(
      this.config.get<string>('jwt.refreshExpiry') ?? '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: expiresInSec,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresInSec,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: expiresInSec };
  }

  private async generateStaffTokens(staffMember: any) {
    const payload: JwtPayload = {
      sub: staffMember.id,
      type: TokenType.STAFF,
      role: staffMember.role,
    };

    const expiresInSec = this.getExpirySeconds(
      this.config.get<string>('jwt.expiry') ?? '1h',
    );
    const refreshExpiresInSec = this.getExpirySeconds(
      this.config.get<string>('jwt.refreshExpiry') ?? '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: expiresInSec,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresInSec,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: expiresInSec };
  }

  private async exchangeLineCode(
    code: string,
    redirectUri: string,
  ): Promise<{ userId: string; displayName?: string; pictureUrl?: string }> {
    const channelId = this.config.get<string>('line.channelSecret') ?? '';
    const channelSecret =
      this.config.get<string>('line.channelAccessToken') ?? '';

    try {
      const tokenResponse = await fetch(
        'https://api.line.me/oauth2/v2.1/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: channelId,
            client_secret: channelSecret,
          }),
        },
      );

      if (!tokenResponse.ok) {
        this.logger.warn(`LINE token exchange failed: ${tokenResponse.status}`);
        throw new UnauthorizedException('LINE authorization code ไม่ถูกต้อง');
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        id_token?: string;
      };

      const profileResponse = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileResponse.ok) {
        throw new UnauthorizedException('ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้');
      }

      const profile = (await profileResponse.json()) as {
        userId: string;
        displayName?: string;
        pictureUrl?: string;
      };

      return profile;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('LINE login error', error);
      throw new UnauthorizedException('LINE login ล้มเหลว');
    }
  }

  private async generatePatientNo(): Promise<string> {
    const result = await this.db
      .select({ patientNo: patients.patientNo })
      .from(patients)
      .orderBy(patients.createdAt)
      .limit(1);

    if (result.length === 0) {
      return 'PT-00001';
    }

    const lastNo = result[0].patientNo ?? 'PT-00000';
    const num = parseInt(lastNo.replace('PT-', ''), 10) + 1;
    return `PT-${num.toString().padStart(5, '0')}`;
  }

  private getExpirySeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;
    const [, valueStr, unit] = match;
    const value = parseInt(valueStr!, 10);
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit!] ?? 3600);
  }
}
