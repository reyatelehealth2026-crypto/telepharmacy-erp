import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@telepharmacy/shared';
import { ROLES_KEY, TokenType } from '../auth.constants';
import type { RequestUser } from '../interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.type !== TokenType.STAFF) {
      throw new ForbiddenException('Staff access required');
    }

    if (!user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
