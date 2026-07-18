import { ConfigService } from '$lib/config/config.service';
import { PrismaService } from '$lib/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

function makeConfig(): ConfigService {
	return {
		jwt: { accessSecret: 'access-secret' },
	} as unknown as ConfigService;
}

function makePrisma() {
	return {
		user: { findUnique: jest.fn() },
		userIdentity: { findFirst: jest.fn() },
	} as unknown as PrismaService & {
		user: { findUnique: jest.Mock };
		userIdentity: { findFirst: jest.Mock };
	};
}

describe('JwtStrategy', () => {
	describe('validate', () => {
		it('throws UnauthorizedException when the user no longer exists', async () => {
			const prisma = makePrisma();
			prisma.user.findUnique.mockResolvedValue(null);
			const strategy = new JwtStrategy(makeConfig(), prisma);

			await expect(
				strategy.validate({ sub: 'missing-user' }),
			).rejects.toBeInstanceOf(UnauthorizedException);
			expect(prisma.userIdentity.findFirst).not.toHaveBeenCalled();
		});

		it("reads emailVerified off the user's local (password) identity", async () => {
			const prisma = makePrisma();
			prisma.user.findUnique.mockResolvedValue({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
			prisma.userIdentity.findFirst.mockResolvedValue({ emailVerified: false });
			const strategy = new JwtStrategy(makeConfig(), prisma);

			const result = await strategy.validate({ sub: 'user-1' });

			expect(prisma.userIdentity.findFirst).toHaveBeenCalledWith({
				where: { userId: 'user-1', providerCode: 'local' },
				select: { emailVerified: true },
			});
			expect(result).toEqual({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
				emailVerified: false,
			});
		});

		it('defaults emailVerified to true when there is no local identity (OAuth only user)', async () => {
			const prisma = makePrisma();
			prisma.user.findUnique.mockResolvedValue({
				id: 'user-2',
				email: 'oauth@example.test',
				phone: null,
				displayName: 'OAuth User',
				role: 'USER',
			});
			prisma.userIdentity.findFirst.mockResolvedValue(null);
			const strategy = new JwtStrategy(makeConfig(), prisma);

			const result = await strategy.validate({ sub: 'user-2' });

			expect(result.emailVerified).toBe(true);
		});

		it('never leaks the local identity secretHash onto the resolved user', async () => {
			const prisma = makePrisma();
			prisma.user.findUnique.mockResolvedValue({
				id: 'user-1',
				email: 'ada@example.test',
				phone: null,
				displayName: 'Ada',
				role: 'USER',
			});
			prisma.userIdentity.findFirst.mockResolvedValue({ emailVerified: true });
			const strategy = new JwtStrategy(makeConfig(), prisma);

			const result = await strategy.validate({ sub: 'user-1' });

			expect(result).not.toHaveProperty('secretHash');
		});
	});
});
