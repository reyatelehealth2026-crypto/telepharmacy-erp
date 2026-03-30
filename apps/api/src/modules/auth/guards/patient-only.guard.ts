import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATIENT_ONLY_KEY, TokenType } from '../auth.constants';
import type { RequestUser } from '../interfaces';

@Injectable()
export class PatientOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPatientOnly = this.reflector.getAllAndOverride<boolean>(
      PATIENT_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!isPatientOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user || user.type !== TokenType.PATIENT) {
      throw new ForbiddenException('Patient access only');
    }

    return true;
  }
}
