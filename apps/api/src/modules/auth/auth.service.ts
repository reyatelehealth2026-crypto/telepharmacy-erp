import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { staff, patients, accountLinkTokens } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { TokenType } from './auth.constants';
import type { JwtPayload, RequestUser } from './interfaces';
import type { LineLoginDto } from './dto/line-login.dto';
import type { StaffLoginDto } from './dto/staff-login.dto';
import type { PdpaConsentDto } from './dto/pdpa-consent.dto';
import type { RegisterPatientDto } from './dto/register-patient.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async lineLogin(dto: LineLoginDto) {
    const lineProfile = await this.verifyLineToken(dto.lineAccessToken);

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

  /**
   * Register a new patient with full profile + LINE binding.
   */
  async register(dto: RegisterPatientDto) {
    const lineProfile = await this.verifyLineToken(dto.lineAccessToken);

    // Check if LINE user already has an account
    const [existing] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.lineUserId, lineProfile.userId))
      .limit(1);

    if (existing && existing.phone) {
      // Already fully registered — just return tokens
      const tokens = await this.generatePatientTokens(existing);
      return {
        ...tokens,
        tokenType: 'Bearer',
        patient: {
          id: existing.id,
          patientNo: existing.patientNo,
          firstName: existing.firstName,
          lastName: existing.lastName,
          isRegistered: true,
        },
        isNewPatient: false,
      };
    }

    const now = new Date();
    const patientNo = existing?.patientNo ?? (await this.generatePatientNo());

    const values: any = {
      lineUserId: lineProfile.userId,
      patientNo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      birthDate: dto.dateOfBirth ?? null,
      gender: dto.gender ?? null,
      weight: dto.weight ? String(dto.weight) : null,
      height: dto.height ? String(dto.height) : null,
      pdpaConsentAt: now,
      pdpaVersion: dto.pdpaConsentVersion,
      lineLinkedAt: now,
      updatedAt: now,
    };

    let patient: any;
    if (existing) {
      // Update the skeleton record created by lineLogin/webhook
      [patient] = await this.db
        .update(patients)
        .set(values)
        .where(eq(patients.id, existing.id))
        .returning();
    } else {
      [patient] = await this.db
        .insert(patients)
        .values({ ...values, province: '' })
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
        isRegistered: true,
      },
      isNewPatient: !existing,
    };
  }

  /**
   * Generate a short-lived account link token for binding an existing patient to LINE.
   */
  async requestAccountLink(patientId: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    await this.db.insert(accountLinkTokens).values({
      token,
      patientId,
      expiresAt,
    });

    this.logger.log(`Account link token created for patient ${patientId}`);
    return { token, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Confirm account link — bind patientId to LINE userId using the token.
   */
  async confirmAccountLink(token: string, lineUserId: string) {
    const [linkToken] = await this.db
      .select()
      .from(accountLinkTokens)
      .where(
        and(
          eq(accountLinkTokens.token, token),
          isNull(accountLinkTokens.usedAt),
        ),
      )
      .limit(1);

    if (!linkToken) {
      throw new BadRequestException('โทเค็นไม่ถูกต้องหรือถูกใช้แล้ว');
    }

    if (new Date() > linkToken.expiresAt) {
      throw new BadRequestException('โทเค็นหมดอายุแล้ว');
    }

    // Check if LINE user is already linked to another patient
    const [existingLink] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.lineUserId, lineUserId))
      .limit(1);

    if (existingLink && existingLink.id !== linkToken.patientId) {
      throw new ConflictException('บัญชี LINE นี้เชื่อมต่อกับผู้ป่วยรายอื่นแล้ว');
    }

    // Bind LINE user to patient
    await this.db
      .update(patients)
      .set({
        lineUserId,
        lineLinkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(patients.id, linkToken.patientId));

    // Mark token as used
    await this.db
      .update(accountLinkTokens)
      .set({ usedAt: new Date(), lineUserId })
      .where(eq(accountLinkTokens.id, linkToken.id));

    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, linkToken.patientId))
      .limit(1);

    const tokens = await this.generatePatientTokens(patient);

    this.logger.log(`Account linked: patient ${linkToken.patientId} → LINE ${lineUserId}`);

    return {
      ...tokens,
      tokenType: 'Bearer',
      patient: {
        id: patient.id,
        patientNo: patient.patientNo,
        firstName: patient.firstName,
        lastName: patient.lastName,
      },
      message: 'เชื่อมต่อบัญชี LINE สำเร็จ',
    };
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

  private async verifyLineToken(
    accessToken: string,
  ): Promise<{ userId: string; displayName?: string; pictureUrl?: string }> {
    try {
      const verifyRes = await fetch(
        ,
      );
      if (!verifyRes.ok) {
        this.logger.warn();
        throw new UnauthorizedException('LINE access token ไม่ถูกต้อง');
      }
      const verifyData = (await verifyRes.json()) as { client_id: string; expires_in: number };
      const channelId = this.config.get<string>('line.channelId') ?? '';
      if (verifyData.client_id !== channelId) {
        throw new UnauthorizedException('LINE channel ไม่ตรงกัน');
      }

      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization:  },
      });
      if (!profileRes.ok) {
        throw new UnauthorizedException('ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้');
      }
      return (await profileRes.json()) as { userId: string; displayName?: string; pictureUrl?: string };
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
      .orderBy(desc(patients.createdAt))
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
