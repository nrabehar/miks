import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('email.resendApiKey');
    if (!apiKey) this.logger.warn('RESEND_API_KEY is not set — emails will fail to send');
    this.resend = new Resend(apiKey);
  }

  async send(to: string, subject: string, html: string, from: string): Promise<void> {
    const { data, error } = await this.resend.emails.send({ from, to, subject, html });
    if (error) {
      this.logger.error(`Resend failed to send to ${to} ("${subject}"): ${error.name} — ${error.message}`);
      throw new Error(`Resend error: ${error.message}`);
    }
    this.logger.log(`Email sent to ${to} ("${subject}") — id=${data?.id}`);
  }
}
