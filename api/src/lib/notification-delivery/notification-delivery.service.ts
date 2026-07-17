import { MailService } from '$lib/mail/mail.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationDeliveryService {
	constructor(private readonly mail: MailService) {}

	async sendCode(
		identifier: string,
		subject: string,
		message: string,
	): Promise<void> {
		await this.mail.send(identifier, subject, message);
	}
}
