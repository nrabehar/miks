import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import configuration from './configuration';
import { validate } from './config.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configuration],
      validate,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
