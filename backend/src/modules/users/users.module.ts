import { PrismaModule } from '#core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { AccountsService } from './accounts/accounts.service';
import { UsersService } from './users.service';

@Module({
	imports: [PrismaModule],
	controllers: [],
	providers: [UsersService, AccountsService],
	exports: [UsersService, AccountsService],
})
export class UsersModule {}
