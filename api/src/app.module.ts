import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './lib/config/config.module';
import { PrismaModule } from './lib/database/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
