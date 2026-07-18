import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { VoteConfigService } from './vote-config.service';

function makePrisma() {
	return {
		group: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
	} as unknown as PrismaService & {
		group: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };

describe('VoteConfigService', () => {
	let prisma: ReturnType<typeof makePrisma>;
	let audit: ReturnType<typeof makeAudit>;
	let service: VoteConfigService;

	beforeEach(() => {
		prisma = makePrisma();
		audit = makeAudit();
		service = new VoteConfigService(prisma, audit);
	});

	describe('get', () => {
		it('returns the built-in defaults when the group has no voteConfig in its metadata', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ metadata: {} });

			const result = await service.get('group-1');

			expect(result).toEqual({
				approvalThreshold: 50,
				minQuorum: 1,
				durationHours: 72,
			});
		});

		it("returns the group's stored voteConfig, overriding just the defaults it sets", async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({
				metadata: { voteConfig: { minQuorum: 3 } },
			});

			const result = await service.get('group-1');

			expect(result).toEqual({
				approvalThreshold: 50,
				minQuorum: 3,
				durationHours: 72,
			});
		});
	});

	describe('update', () => {
		it('merges only the submitted fields over the current config', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({
				metadata: {
					voteConfig: { approvalThreshold: 60, minQuorum: 2, durationHours: 48 },
				},
			});

			const result = await service.update('group-1', member as never, {
				minQuorum: 5,
			});

			expect(result).toEqual({
				approvalThreshold: 60,
				minQuorum: 5,
				durationHours: 48,
			});
			expect(prisma.group.update).toHaveBeenCalledWith({
				where: { id: 'group-1' },
				data: {
					metadata: {
						voteConfig: {
							approvalThreshold: 60,
							minQuorum: 5,
							durationHours: 48,
						},
					},
				},
			});
		});

		it("preserves other keys already present in the group's metadata", async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({
				metadata: { someOtherSetting: 'keep-me' },
			});

			await service.update('group-1', member as never, { minQuorum: 2 });

			expect(prisma.group.update).toHaveBeenCalledWith({
				where: { id: 'group-1' },
				data: {
					metadata: expect.objectContaining({ someOtherSetting: 'keep-me' }),
				},
			});
		});

		it('logs GROUP_VOTE_CONFIG_UPDATED with the resulting config', async () => {
			prisma.group.findUniqueOrThrow.mockResolvedValue({ metadata: {} });

			await service.update('group-1', member as never, {
				approvalThreshold: 75,
			});

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'GROUP_VOTE_CONFIG_UPDATED',
					groupId: 'group-1',
					actorId: 'user-1',
					payload: { approvalThreshold: 75, minQuorum: 1, durationHours: 72 },
				}),
			);
		});
	});
});
