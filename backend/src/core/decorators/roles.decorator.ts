import { SetMetadata } from '@nestjs/common';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';
// Role values mirror the Prisma MemberRole enum
export const WorkspaceRoles = (...roles: ('ADMIN' | 'MEMBER' | 'OBSERVER')[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
