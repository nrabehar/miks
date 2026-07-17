import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
	await prisma.authProvider.createMany({
		data: [
			{ code: 'local', name: 'Local', category: 'LOCAL' },
			{ code: 'google', name: 'Google', category: 'OAUTH' },
			{ code: 'facebook', name: 'Facebook', category: 'OAUTH' },
		],
		skipDuplicates: true,
	});

	await prisma.verificationTokenPurpose.createMany({
		data: [
			{ code: 'EMAIL_VERIFICATION', name: 'Email verification' },
			{ code: 'PASSWORD_RESET', name: 'Password reset' },
		],
		skipDuplicates: true,
	});
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
