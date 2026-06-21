import { registerAs } from '@nestjs/config';

export interface EmailConfig {
	apiKey: string;
}

export default registerAs('email', async (): Promise<EmailConfig> => {
	return {
		apiKey: process.env.RESEND_API_KEY!,
	};
});
