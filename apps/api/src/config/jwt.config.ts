import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }

  return {
    secret,
    refreshSecret,
    expiry: process.env.JWT_EXPIRY ?? '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  };
});
