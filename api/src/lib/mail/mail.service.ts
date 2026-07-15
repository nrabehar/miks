import { ConfigService } from '$lib/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly resend: Resend;

	constructor(private readonly config: ConfigService) {
		this.resend = new Resend(this.config.mail.resendApiKey);
	}

	async send(to: string, subject: string, text: string): Promise<void> {
		const { error } = await this.resend.emails.send({
			from: `MIKS <no-reply@${this.config.mail.domain}>`,
			to,
			subject,
			text,
		});

		if (error) {
			this.logger.error(
				`Failed to send email to ${to}: ${error.message}`,
			);
			throw new Error(`Failed to send email: ${error.message}`);
		}
	}
}
