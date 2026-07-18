import { AuditService } from '$lib/audit/audit.service';
import { VoteResolverRegistry } from '$/votes/vote-resolver.registry';
import { MemberRemovalVoteResolver } from './member-removal-vote.resolver';

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeTx() {
	return { groupMember: { update: jest.fn() } };
}

describe('MemberRemovalVoteResolver', () => {
	let audit: ReturnType<typeof makeAudit>;
	let registry: VoteResolverRegistry;
	let resolver: MemberRemovalVoteResolver;

	beforeEach(() => {
		audit = makeAudit();
		registry = new VoteResolverRegistry();
		resolver = new MemberRemovalVoteResolver(registry, audit);
	});

	it('registers itself against the MEMBER_REMOVAL subject type on module init', () => {
		resolver.onModuleInit();

		expect(registry.get('MEMBER_REMOVAL')).toBe(resolver);
	});

	describe('onResolved', () => {
		const vote = {
			id: 'vote-1',
			groupId: 'group-1',
			targetMemberId: 'target-1',
		};

		it('moves the target member to LEFT when the vote is APPROVED (AC-11)', async () => {
			const tx = makeTx();

			await resolver.onResolved(tx as never, vote as never, 'APPROVED');

			expect(tx.groupMember.update).toHaveBeenCalledWith({
				where: { id: 'target-1' },
				data: { status: 'LEFT', leftAt: expect.any(Date) },
			});
		});

		it('does not touch the target member when the vote is REJECTED', async () => {
			const tx = makeTx();

			await resolver.onResolved(tx as never, vote as never, 'REJECTED');

			expect(tx.groupMember.update).not.toHaveBeenCalled();
		});

		it('does not touch the target member when the vote is INVALID', async () => {
			const tx = makeTx();

			await resolver.onResolved(tx as never, vote as never, 'INVALID');

			expect(tx.groupMember.update).not.toHaveBeenCalled();
		});
	});

	describe('afterResolved', () => {
		const vote = {
			id: 'vote-1',
			groupId: 'group-1',
			targetMemberId: 'target-1',
		};

		it('logs MEMBER_REMOVAL_VOTE_DECIDED for every decision', async () => {
			await resolver.afterResolved(vote as never, 'REJECTED');

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVAL_VOTE_DECIDED' }),
			);
			expect(audit.log).toHaveBeenCalledTimes(1);
		});

		it('additionally logs MEMBER_REMOVED when APPROVED', async () => {
			await resolver.afterResolved(vote as never, 'APPROVED');

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVAL_VOTE_DECIDED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'MEMBER_REMOVED' }),
			);
			expect(audit.log).toHaveBeenCalledTimes(2);
		});
	});
});
