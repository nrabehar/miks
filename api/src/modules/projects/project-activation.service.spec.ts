import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { ProjectActivationService } from './project-activation.service';

function makeTx() {
	return {
		vault: { updateMany: jest.fn(), update: jest.fn() },
		project: {
			updateMany: jest.fn(),
			findUniqueOrThrow: jest.fn(),
		},
		transaction: { create: jest.fn() },
	};
}

function makePrisma() {
	const prisma = {
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(prisma),
		),
	};

	return prisma as unknown as PrismaService & { $transaction: jest.Mock };
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

const baseProject = {
	id: 'project-1',
	groupId: 'group-1',
	status: 'APPROVED',
	sourceVaultId: 'source-vault-1',
	payoutVaultId: null,
	requestedBudget: 300,
};

describe('ProjectActivationService', () => {
	let audit: ReturnType<typeof makeAudit>;
	let service: ProjectActivationService;

	beforeEach(() => {
		audit = makeAudit();
	});

	describe('attempt', () => {
		it('does nothing and returns activated:false for a project that is not APPROVED (AC-3)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();

			const result = await service.attempt(tx as never, {
				...baseProject,
				status: 'PENDING',
			} as never);

			expect(result).toEqual({
				project: { ...baseProject, status: 'PENDING' },
				activated: false,
			});
			expect(tx.vault.updateMany).not.toHaveBeenCalled();
		});

		it('does nothing when the project has no sourceVaultId', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();

			const result = await service.attempt(tx as never, {
				...baseProject,
				sourceVaultId: null,
			} as never);

			expect(result.activated).toBe(false);
			expect(tx.vault.updateMany).not.toHaveBeenCalled();
		});

		it('stays APPROVED (activated:false) when sourceVault balance is insufficient (AC-4)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();
			tx.vault.updateMany.mockResolvedValue({ count: 0 });

			const result = await service.attempt(tx as never, baseProject as never);

			expect(result).toEqual({ project: baseProject, activated: false });
			expect(tx.vault.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'source-vault-1',
					cachedBalance: { gte: 300 },
				},
				data: { cachedBalance: { decrement: 300 } },
			});
			expect(tx.project.updateMany).not.toHaveBeenCalled();
		});

		it('debits sourceVault, moves the project to ACTIVE, and records a PROJECT_PAYOUT debit when funds suffice and no payoutVault is set (AC-3)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();
			tx.vault.updateMany.mockResolvedValue({ count: 1 });
			tx.project.updateMany.mockResolvedValue({ count: 1 });
			const activated = { ...baseProject, status: 'ACTIVE' };
			tx.project.findUniqueOrThrow.mockResolvedValue(activated);

			const result = await service.attempt(tx as never, baseProject as never);

			expect(result).toEqual({ project: activated, activated: true });
			expect(tx.project.updateMany).toHaveBeenCalledWith({
				where: { id: 'project-1', status: 'APPROVED' },
				data: { status: 'ACTIVE' },
			});
			expect(tx.transaction.create).toHaveBeenCalledTimes(1);
			expect(tx.transaction.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					vaultId: 'source-vault-1',
					direction: 'DEBIT',
					amount: 300,
					type: 'PROJECT_PAYOUT',
				}),
			});
			expect(tx.vault.update).not.toHaveBeenCalled();
		});

		it('also credits the payoutVault with a matching CREDIT transaction when one is designated (AC-3)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();
			tx.vault.updateMany.mockResolvedValue({ count: 1 });
			tx.project.updateMany.mockResolvedValue({ count: 1 });
			const project = { ...baseProject, payoutVaultId: 'payout-vault-1' };
			tx.project.findUniqueOrThrow.mockResolvedValue({
				...project,
				status: 'ACTIVE',
			});

			await service.attempt(tx as never, project as never);

			expect(tx.vault.update).toHaveBeenCalledWith({
				where: { id: 'payout-vault-1' },
				data: { cachedBalance: { increment: 300 } },
			});
			expect(tx.transaction.create).toHaveBeenCalledTimes(2);
			expect(tx.transaction.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					vaultId: 'payout-vault-1',
					direction: 'CREDIT',
					amount: 300,
					type: 'PROJECT_PAYOUT',
				}),
			});
		});

		it('undoes the optimistic debit and returns activated:false when it loses the race to activate (AC-3)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const tx = makeTx();
			tx.vault.updateMany.mockResolvedValue({ count: 1 });
			tx.project.updateMany.mockResolvedValue({ count: 0 });

			const result = await service.attempt(tx as never, baseProject as never);

			expect(result).toEqual({ project: baseProject, activated: false });
			expect(tx.vault.update).toHaveBeenCalledWith({
				where: { id: 'source-vault-1' },
				data: { cachedBalance: { increment: 300 } },
			});
			expect(tx.transaction.create).not.toHaveBeenCalled();
		});
	});

	describe('retryIfApproved', () => {
		it('returns the project unchanged without opening a transaction when not APPROVED', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			const project = { ...baseProject, status: 'ACTIVE' };

			const result = await service.retryIfApproved(project as never);

			expect(result).toBe(project);
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it('logs PROJECT_PAYOUT_ISSUED and PROJECT_ACTIVATED when activation succeeds (AC-4)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			jest.spyOn(service, 'attempt').mockResolvedValue({
				project: { ...baseProject, status: 'ACTIVE' },
				activated: true,
			} as never);

			const result = await service.retryIfApproved(baseProject as never);

			expect(result).toEqual({ ...baseProject, status: 'ACTIVE' });
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_PAYOUT_ISSUED' }),
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_ACTIVATED' }),
			);
		});

		it('logs nothing when the retry does not activate (still underfunded)', async () => {
			const prisma = makePrisma();
			service = new ProjectActivationService(prisma, audit);
			jest.spyOn(service, 'attempt').mockResolvedValue({
				project: baseProject as never,
				activated: false,
			});

			await service.retryIfApproved(baseProject as never);

			expect(audit.log).not.toHaveBeenCalled();
		});
	});
});
