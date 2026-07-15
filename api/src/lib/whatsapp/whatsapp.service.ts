import { ConfigService } from '$lib/config/config.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
	private readonly logger = new Logger(WhatsappService.name);

	constructor(private readonly config: ConfigService) {}

	async sendText(to: string, body: string): Promise<void> {
		const response = await fetch(
			`${this.config.whatsapp.apiUrl}/messages`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.config.whatsapp.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					messaging_product: 'whatsapp',
					to,
					type: 'text',
					text: { body },
				}),
			},
		);

		if (!response.ok) {
			const errorBody = await response.text();
			this.logger.error(
				`Failed to send WhatsApp message to ${to}: ${response.status} ${errorBody}`,
			);
			throw new Error(
				`Failed to send WhatsApp message: ${response.status}`,
			);
		}
	}
}
