import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, RequestUser } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub || !payload.type) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      type: payload.type,
      role: payload.role,
      lineUserId: payload.lineUserId,
    };
  }
}
