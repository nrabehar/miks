import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { EmailService } from './email.service.js';

@Module({
  providers: [MailService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
