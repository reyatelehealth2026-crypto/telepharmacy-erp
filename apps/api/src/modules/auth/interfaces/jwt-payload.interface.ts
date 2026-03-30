import type { UserRole } from '@telepharmacy/shared';
import type { TokenType } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  type: TokenType;
  role?: UserRole;
  lineUserId?: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  type: TokenType;
  role?: UserRole;
  lineUserId?: string;
}
