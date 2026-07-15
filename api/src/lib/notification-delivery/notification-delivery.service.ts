import { MailService } from '$lib/mail/mail.service';
import { WhatsappService } from '$lib/whatsapp/whatsapp.service';
import { Injectable } from '@nestjs/common';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailIdentifier(identifier: string): boolean {
	return EMAIL_PATTERN.test(identifier);
}

@Injectable()
export class NotificationDeliveryService {
	constructor(
		private readonly mail: MailService,
		private readonly whatsapp: WhatsappService,
	) {}

	async sendCode(
		identifier: string,
		subject: string,
		message: string,
	): Promise<void> {
		if (isEmailIdentifier(identifier)) {
			await this.mail.send(identifier, subject, message);
		} else {
			await this.whatsapp.sendText(identifier, message);
		}
	}
}
