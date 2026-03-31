import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Represents the payload embedded inside a prescription digital signature.
 * Every field is included in the HMAC calculation so that any tampering
 * with the data invalidates the signature (Thai Pharmacy Act compliance).
 */
export interface PrescriptionSignaturePayload {
  /** UUID of the prescription being signed. */
  prescriptionId: string;
  /** UUID of the pharmacist who made the verification decision. */
  pharmacistId: string;
  /** Full display name of the pharmacist (first + last). */
  pharmacistName: string;
  /** Thai pharmacist license number (เลขใบอนุญาตประกอบวิชาชีพเภสัชกรรม). */
  pharmacistLicenseNo: string;
  /** The pharmacist's decision: approved | rejected | partial | referred. */
  decision: string;
  /** Free-text intervention or rejection notes. */
  interventionNotes: string;
  /** ISO-8601 timestamp of when the signature was created. */
  signedAt: string;
}

interface SignatureToken {
  /** Base64url-encoded HMAC-SHA256 of the canonical payload. */
  hmac: string;
  /** The payload that was signed (also base64url-encoded). */
  payload: string;
}

@Injectable()
export class PrescriptionSignatureService {
  private readonly logger = new Logger(PrescriptionSignatureService.name);
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.signingSecret = this.configService.get<string>(
      'PRESCRIPTION_SIGNING_SECRET',
    ) ?? 'telepharmacy-prescription-default-secret';
  }

  /**
   * Create a tamper-proof digital signature for a prescription approval.
   *
   * The token is a compound string: `base64url(payload).base64url(hmac)`.
   * The HMAC covers the canonical JSON of the payload so that any change
   * to prescriptionId, pharmacistId, decision, etc. invalidates it.
   */
  signPrescription(
    prescriptionId: string,
    pharmacist: {
      id: string;
      firstName: string;
      lastName: string;
      licenseNo: string | null;
    },
    decision: string,
    interventionNotes: string,
  ): string {
    if (!pharmacist.licenseNo) {
      throw new BadRequestException(
        'Pharmacist license number is required to sign prescriptions',
      );
    }

    const payload: PrescriptionSignaturePayload = {
      prescriptionId,
      pharmacistId: pharmacist.id,
      pharmacistName: `${pharmacist.firstName} ${pharmacist.lastName}`,
      pharmacistLicenseNo: pharmacist.licenseNo,
      decision,
      interventionNotes: interventionNotes ?? '',
      signedAt: new Date().toISOString(),
    };

    // Canonical ordering ensures deterministic HMAC across re-computations.
    const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
    const payloadB64 = this.toBase64Url(canonicalPayload);

    const hmac = this.computeHmac(payloadB64);
    const token = `${payloadB64}.${hmac}`;

    this.logger.log(
      `Prescription ${prescriptionId} signed by pharmacist ${pharmacist.id} with decision "${decision}"`,
    );

    return token;
  }

  /**
   * Verify a prescription signature token.
   *
   * Returns the decoded payload if the HMAC is valid.
   * Throws if the token is malformed or the HMAC does not match.
   */
  verifyPrescriptionSignature(
    token: string,
  ): PrescriptionSignaturePayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException(
        'Invalid prescription signature: malformed token format',
      );
    }

    const [payloadB64, providedHmac] = parts as [string, string];

    // Recompute the expected HMAC from the payload portion.
    const expectedHmac = this.computeHmac(payloadB64);

    // timingSafeEqual prevents timing-attack comparisons.
    const providedBuf = Buffer.from(providedHmac, 'utf-8');
    const expectedBuf = Buffer.from(expectedHmac, 'utf-8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException(
        'Invalid prescription signature: HMAC verification failed — token may have been tampered with',
      );
    }

    try {
      const canonicalPayload = this.fromBase64Url(payloadB64);
      const payload = JSON.parse(canonicalPayload) as PrescriptionSignaturePayload;

      // Basic structural validation of the decoded payload.
      if (
        !payload.prescriptionId ||
        !payload.pharmacistId ||
        !payload.pharmacistName ||
        !payload.pharmacistLicenseNo ||
        !payload.decision ||
        !payload.signedAt
      ) {
        throw new UnauthorizedException(
          'Invalid prescription signature: payload is missing required fields',
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Invalid prescription signature: unable to decode payload',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private computeHmac(data: string): string {
    return createHmac('sha256', this.signingSecret).update(data).digest('base64url');
  }

  private toBase64Url(str: string): string {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }

  private fromBase64Url(b64: string): string {
    return Buffer.from(b64, 'base64url').toString('utf-8');
  }
}
