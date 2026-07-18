import { AuditService } from '$lib/audit/audit.service';
import { VoteResolverRegistry } from '$/votes/vote-resolver.registry';
import { ProjectActivationService } from './project-activation.service';
import { ProjectVoteResolver } from './project-vote.resolver';

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeActivation() {
	return {
		attempt: jest.fn(),
	} as unknown as ProjectActivationService & { attempt: jest.Mock };
}

function makeTx() {
	return {
		project: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
	};
}

const vote = {
	id: 'vote-1',
	groupId: 'group-1',
	projectId: 'project-1',
};

describe('ProjectVoteResolver', () => {
	let registry: VoteResolverRegistry;
	let audit: ReturnType<typeof makeAudit>;
	let activation: ReturnType<typeof makeActivation>;
	let resolver: ProjectVoteResolver;

	beforeEach(() => {
		registry = new VoteResolverRegistry();
		audit = makeAudit();
		activation = makeActivation();
		resolver = new ProjectVoteResolver(registry, audit, activation);
	});

	it('registers itself against the PROJECT subject type on module init', () => {
		resolver.onModuleInit();

		expect(registry.get('PROJECT')).toBe(resolver);
	});

	describe('onResolved', () => {
		it('does nothing for a vote with no projectId', async () => {
			const tx = makeTx();

			const result = await resolver.onResolved(
				tx as never,
				{ ...vote, projectId: null } as never,
				'APPROVED',
			);

			expect(result).toBeUndefined();
			expect(tx.project.update).not.toHaveBeenCalled();
		});

		it('moves the project to REJECTED and does not attempt activation (AC-2)', async () => {
			const tx = makeTx();

			const result = await resolver.onResolved(
				tx as never,
				vote as never,
				'REJECTED',
			);

			expect(tx.project.update).toHaveBeenCalledWith({
				where: { id: 'project-1' },
				data: { status: 'REJECTED' },
			});
			expect(result).toBeUndefined();
			expect(activation.attempt).not.toHaveBeenCalled();
		});

		it('leaves the project untouched on INVALID, so it stays PENDING for a later reopen (AC-2)', async () => {
			const tx = makeTx();

			const result = await resolver.onResolved(
				tx as never,
				vote as never,
				'INVALID',
			);

			expect(tx.project.update).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
			expect(activation.attempt).not.toHaveBeenCalled();
		});

		it('moves the project to APPROVED then attempts activation in the same transaction (AC-3)', async () => {
			const tx = makeTx();
			const approvedProject = { id: 'project-1', status: 'APPROVED' };
			tx.project.findUniqueOrThrow.mockResolvedValue(approvedProject);
			const activationResult = { project: approvedProject, activated: true };
			activation.attempt.mockResolvedValue(activationResult);

			const result = await resolver.onResolved(
				tx as never,
				vote as never,
				'APPROVED',
			);

			expect(tx.project.update).toHaveBeenCalledWith({
				where: { id: 'project-1' },
				data: { status: 'APPROVED' },
			});
			expect(activation.attempt).toHaveBeenCalledWith(tx, approvedProject);
			expect(result).toBe(activationResult);
		});
	});

	describe('afterResolved', () => {
		it('always logs PROJECT_VOTE_DECIDED', async () => {
			await resolver.afterResolved(vote as never, 'INVALID', undefined);

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'PROJECT_VOTE_DECIDED',
					payload: expect.objectContaining({ status: 'INVALID' }),
				}),
			);
		});

		it('additionally logs PROJECT_REJECTED on a REJECTED decision', async () => {
			await resolver.afterResolved(vote as never, 'REJECTED', undefined);

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_REJECTED' }),
			);
			expect(audit.log).toHaveBeenCalledTimes(2);
		});

		it('logs PROJECT_APPROVED but not payout/activation events when activation did not happen (AC-4)', async () => {
			await resolver.afterResolved(vote as never, 'APPROVED', {
				activated: false,
			});

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_APPROVED' }),
			);
			expect(audit.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_PAYOUT_ISSUED' }),
			);
			expect(audit.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_ACTIVATED' }),
			);
		});

		it('logs PROJECT_APPROVED, PROJECT_PAYOUT_ISSUED, and PROJECT_ACTIVATED when activation succeeded (AC-3)', async () => {
			await resolver.afterResolved(vote as never, 'APPROVED', {
				activated: true,
			});

			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_APPROVED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_PAYOUT_ISSUED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_ACTIVATED' }),
			);
			expect(audit.log).toHaveBeenCalledTimes(4);
		});
	});
});
