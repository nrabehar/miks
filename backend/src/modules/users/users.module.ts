import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AccountsService } from './accounts.service.js';

@Module({
  providers: [UsersService, AccountsService],
  exports: [UsersService, AccountsService],
})
export class UsersModule {}
