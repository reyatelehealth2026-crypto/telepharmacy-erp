import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser;
    return data ? user?.[data] : user;
  },
);
