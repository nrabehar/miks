import { AppRoleType } from '$prisma/enums';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRoleType[]) => SetMetadata(ROLES_KEY, roles);
