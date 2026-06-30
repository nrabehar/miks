import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('email.resendApiKey'));
    this.from = config.get<string>('email.from', 'MIKS <noreply@miks.app>');
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({ from: this.from, to, subject, html });
  }
}
