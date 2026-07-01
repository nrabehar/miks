import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  domain: process.env.EMAIL_DOMAIN || 'miks.dedyn.io',
  fromName: process.env.EMAIL_FROM_NAME || 'MIKS',
}));
