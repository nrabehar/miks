import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';
import { CotisationsController } from './cotisations/cotisations.controller.js';
import { CotisationsService } from './cotisations/cotisations.service.js';
import { VaultsController } from './vaults/vaults.controller.js';
import { VaultsService } from './vaults/vaults.service.js';
import { FluxController } from './flux/flux.controller.js';
import { FluxService } from './flux/flux.service.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { GovernanceController } from './governance/governance.controller.js';
import { GovernanceService } from './governance/governance.service.js';
import { WorkspaceAuditController } from './audit/workspace-audit.controller.js';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard.js';
import { AuditModule } from '../audit/audit.module.js';
import { EmailModule } from '../email/email.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuditModule, EmailModule, NotificationsModule],
  controllers: [
    WorkspacesController,
    MembersController,
    CotisationsController,
    VaultsController,
    FluxController,
    ProjectsController,
    GovernanceController,
    WorkspaceAuditController,
  ],
  providers: [
    WorkspacesService,
    MembersService,
    CotisationsService,
    VaultsService,
    FluxService,
    ProjectsService,
    GovernanceService,
    WorkspaceMemberGuard,
  ],
})
export class WorkspacesModule {}
