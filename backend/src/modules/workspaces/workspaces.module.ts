import { Module } from '@nestjs/common';
import { PrismaModule } from '#/core/prisma/prisma.module';
import { UsersModule } from '$/users/users.module';
import { CotisationsController } from './cotisations/cotisations.controller';
import { CotisationsService } from './cotisations/cotisations.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
	imports: [PrismaModule, UsersModule],
	controllers: [WorkspacesController, CotisationsController],
	providers: [WorkspacesService, CotisationsService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
