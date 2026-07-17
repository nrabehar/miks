import { PrismaService } from '$lib/database/prisma.service';
import { Prisma } from '$prisma/client';
import { SharesService } from './shares.service';

function makeTx() {
	return {
		groupMember: { findMany: jest.fn() },
		contribution: { groupBy: jest.fn() },
		memberShareCache: { upsert: jest.fn() },
	};
}

function makePrisma() {
	return {
		memberShareCache: { findMany: jest.fn() },
	} as unknown as PrismaService & {
		memberShareCache: { findMany: jest.Mock };
	};
}

describe('SharesService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let service: SharesService;

	beforeEach(() => {
		prisma = makePrisma();
		service = new SharesService(prisma);
	});

	describe('recompute', () => {
		it('does nothing when the group has no active members', async () => {
			const tx = makeTx();
			tx.groupMember.findMany.mockResolvedValue([]);
			tx.contribution.groupBy.mockResolvedValue([]);

			await service.recompute(tx as never, 'group-1');

			expect(tx.memberShareCache.upsert).not.toHaveBeenCalled();
		});

		it('gives the sole contributing active member 100% (AC-7)', async () => {
			const tx = makeTx();
			tx.groupMember.findMany.mockResolvedValue([{ id: 'member-1' }]);
			tx.contribution.groupBy.mockResolvedValue([
				{
					memberId: 'member-1',
					_sum: { amount: new Prisma.Decimal(1000) },
				},
			]);

			await service.recompute(tx as never, 'group-1');

			expect(tx.memberShareCache.upsert).toHaveBeenCalledTimes(1);
			const call = tx.memberShareCache.upsert.mock.calls[0][0];
			expect(call.where).toEqual({ memberId: 'member-1' });
			expect(call.create.groupId).toBe('group-1');
			expect(call.create.percentage.toString()).toBe('100');
			expect(call.create.totalContributed.toString()).toBe('1000');
		});

		it('splits share proportionally across active members by cumulative contribution (AC-7)', async () => {
			const tx = makeTx();
			tx.groupMember.findMany.mockResolvedValue([
				{ id: 'member-1' },
				{ id: 'member-2' },
			]);
			tx.contribution.groupBy.mockResolvedValue([
				{
					memberId: 'member-1',
					_sum: { amount: new Prisma.Decimal(300) },
				},
				{
					memberId: 'member-2',
					_sum: { amount: new Prisma.Decimal(700) },
				},
			]);

			await service.recompute(tx as never, 'group-1');

			const calls = tx.memberShareCache.upsert.mock.calls;
			const forMember1 = calls.find(
				(c) => c[0].where.memberId === 'member-1',
			)[0];
			const forMember2 = calls.find(
				(c) => c[0].where.memberId === 'member-2',
			)[0];

			expect(forMember1.create.percentage.toString()).toBe('30');
			expect(forMember2.create.percentage.toString()).toBe('70');
		});

		it('gives an active member with zero contributions a 0% share, not skipped (AC-7)', async () => {
			const tx = makeTx();
			tx.groupMember.findMany.mockResolvedValue([
				{ id: 'member-1' },
				{ id: 'member-2' },
			]);
			tx.contribution.groupBy.mockResolvedValue([
				{
					memberId: 'member-1',
					_sum: { amount: new Prisma.Decimal(500) },
				},
			]);

			await service.recompute(tx as never, 'group-1');

			const forMember2 = tx.memberShareCache.upsert.mock.calls.find(
				(c) => c[0].where.memberId === 'member-2',
			)[0];

			expect(forMember2.create.percentage.toString()).toBe('0');
			expect(forMember2.create.totalContributed.toString()).toBe('0');
		});

		it('gives every active member 0% when the group total is zero, without dividing by zero', async () => {
			const tx = makeTx();
			tx.groupMember.findMany.mockResolvedValue([{ id: 'member-1' }]);
			tx.contribution.groupBy.mockResolvedValue([]);

			await service.recompute(tx as never, 'group-1');

			const call = tx.memberShareCache.upsert.mock.calls[0][0];
			expect(call.create.percentage.toString()).toBe('0');
		});
	});

	describe('list', () => {
		it("returns a group's shares ordered by percentage descending", async () => {
			const shares = [{ memberId: 'member-2' }, { memberId: 'member-1' }];
			prisma.memberShareCache.findMany.mockResolvedValue(shares);

			const result = await service.list('group-1');

			expect(result).toBe(shares);
			expect(prisma.memberShareCache.findMany).toHaveBeenCalledWith({
				where: { groupId: 'group-1' },
				orderBy: { percentage: 'desc' },
			});
		});
	});
});
