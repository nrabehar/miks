import { Module } from '@nestjs/common';
import { PrismaModule } from '#/core/prisma/prisma.module';
import { UsersModule } from '$/users/users.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
	imports: [PrismaModule, UsersModule],
	controllers: [WorkspacesController],
	providers: [WorkspacesService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
