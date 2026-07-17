import { PrismaService } from '$lib/database/prisma.service';
import { Prisma, type MemberShareCache } from '$prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SharesService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Recomputes every ACTIVE member's share from their cumulative non
	 * reversed contributions over the group's cumulative total (AC-7).
	 * Called inside the same DB transaction as any contribution change
	 * (a new contribution or a contribution reversal).
	 */
	async recompute(
		tx: Prisma.TransactionClient,
		groupId: string,
	): Promise<void> {
		const members = await tx.groupMember.findMany({
			where: { groupId, status: 'ACTIVE' },
			select: { id: true },
		});

		const totals = await tx.contribution.groupBy({
			by: ['memberId'],
			where: { groupId, reversedAt: null },
			_sum: { amount: true },
		});

		const totalByMember = new Map(
			totals.map((t) => [
				t.memberId,
				t._sum.amount ?? new Prisma.Decimal(0),
			]),
		);

		const groupTotal = totals.reduce(
			(sum, t) => sum.plus(t._sum.amount ?? new Prisma.Decimal(0)),
			new Prisma.Decimal(0),
		);

		for (const member of members) {
			const totalContributed =
				totalByMember.get(member.id) ?? new Prisma.Decimal(0);
			const percentage = groupTotal.isZero()
				? new Prisma.Decimal(0)
				: totalContributed
						.dividedBy(groupTotal)
						.times(100)
						.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

			await tx.memberShareCache.upsert({
				where: { memberId: member.id },
				create: {
					groupId,
					memberId: member.id,
					percentage,
					totalContributed,
				},
				update: {
					percentage,
					totalContributed,
					computedAt: new Date(),
				},
			});
		}
	}

	async list(groupId: string): Promise<MemberShareCache[]> {
		return this.prisma.memberShareCache.findMany({
			where: { groupId },
			orderBy: { percentage: 'desc' },
		});
	}
}
