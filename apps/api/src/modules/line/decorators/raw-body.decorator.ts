import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RawBody = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Buffer | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.rawBody;
  },
);
