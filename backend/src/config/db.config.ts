import { registerAs } from '@nestjs/config';

export default registerAs('db', () => ({
	url:
		process.env.DATABASE_URL ||
		'postgresql://postgres:postgres@localhost:5432/miks',
}));
