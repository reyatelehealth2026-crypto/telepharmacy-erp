import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@telepharmacy/shared';
import { ROLES_KEY } from '../auth.constants';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
