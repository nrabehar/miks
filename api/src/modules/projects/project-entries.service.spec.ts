import { AuditService } from '$lib/audit/audit.service';
import { PrismaService } from '$lib/database/prisma.service';
import { FlowRulesService } from '$/vaults/flow-rules.service';
import {
	ConflictException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ProjectEntriesService } from './project-entries.service';
import { ProjectsService } from './projects.service';

function makePrisma() {
	const prisma = {
		transaction: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
		project: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
		$transaction: jest.fn((callback: (tx: unknown) => unknown) =>
			callback(tx),
		),
	};
	const tx = {
		vault: { updateMany: jest.fn(), update: jest.fn() },
		transaction: { create: jest.fn() },
	};

	return {
		prisma: prisma as unknown as PrismaService & {
			transaction: {
				findFirst: jest.Mock;
				findMany: jest.Mock;
				count: jest.Mock;
			};
			project: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
			$transaction: jest.Mock;
		},
		tx,
	};
}

function makeAudit() {
	return {
		log: jest.fn().mockResolvedValue(undefined),
	} as unknown as AuditService & { log: jest.Mock };
}

function makeFlowRules() {
	return {
		applyProjectEntryRules: jest.fn(),
	} as unknown as FlowRulesService & { applyProjectEntryRules: jest.Mock };
}

function makeProjects(project: unknown) {
	return {
		loadProject: jest.fn().mockResolvedValue(project),
	} as unknown as ProjectsService & { loadProject: jest.Mock };
}

const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' };
const activeProject = { id: 'project-1', groupId: 'group-1', status: 'ACTIVE' };

describe('ProjectEntriesService', () => {
	describe('recordRevenue / recordExpense', () => {
		it('rejects recording an entry on a project that is not ACTIVE (AC-5, AC-6)', async () => {
			const { prisma } = makePrisma();
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects({ ...activeProject, status: 'PENDING' });
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.recordRevenue('group-1', 'project-1', member as never, {
					amount: 100,
				}),
			).rejects.toThrow(UnprocessableEntityException);
			expect(flowRules.applyProjectEntryRules).not.toHaveBeenCalled();
		});

		it('applies PROJECT_REVENUE distribution and logs PROJECT_REVENUE_RECORDED (AC-5)', async () => {
			const { prisma, tx } = makePrisma();
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const transactions = [{ id: 'txn-1' }];
			flowRules.applyProjectEntryRules.mockResolvedValue(transactions);
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			const result = await service.recordRevenue(
				'group-1',
				'project-1',
				member as never,
				{ amount: 150, description: 'Ticket sales' },
			);

			expect(result).toBe(transactions);
			expect(flowRules.applyProjectEntryRules).toHaveBeenCalledWith(
				tx,
				'group-1',
				'PROJECT_REVENUE',
				'project-1',
				expect.objectContaining({ toString: expect.any(Function) }),
				'user-1',
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'PROJECT_REVENUE_RECORDED',
					payload: expect.objectContaining({ amount: 150 }),
				}),
			);
		});

		it('applies PROJECT_EXPENSE distribution and logs PROJECT_EXPENSE_RECORDED (AC-6)', async () => {
			const { prisma } = makePrisma();
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			flowRules.applyProjectEntryRules.mockResolvedValue([{ id: 'txn-2' }]);
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await service.recordExpense('group-1', 'project-1', member as never, {
				amount: 40,
			});

			expect(flowRules.applyProjectEntryRules).toHaveBeenCalledWith(
				expect.anything(),
				'group-1',
				'PROJECT_EXPENSE',
				'project-1',
				expect.anything(),
				'user-1',
			);
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_EXPENSE_RECORDED' }),
			);
		});

		it('propagates the insufficient balance error from the flow rules distribution (AC-6)', async () => {
			const { prisma } = makePrisma();
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			flowRules.applyProjectEntryRules.mockRejectedValue(
				new UnprocessableEntityException('Insufficient balance to debit this destination'),
			);
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.recordExpense('group-1', 'project-1', member as never, {
					amount: 99999,
				}),
			).rejects.toThrow(UnprocessableEntityException);
			expect(audit.log).not.toHaveBeenCalled();
		});
	});

	describe('reverse', () => {
		it('throws NotFoundException when the transaction does not exist in the group (AC-7)', async () => {
			const { prisma } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue(null);
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.reverse('group-1', 'project-1', 'txn-missing', member as never),
			).rejects.toThrow(NotFoundException);
		});

		it("rejects a transaction that is not this project's revenue/expense entry (AC-7)", async () => {
			const { prisma } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				sourceRefId: 'project-1',
				sourceType: 'PROJECT_PAYOUT',
				reversals: [],
			});
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.reverse('group-1', 'project-1', 'txn-1', member as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects a transaction belonging to a different project (AC-7)', async () => {
			const { prisma } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				sourceRefId: 'other-project',
				sourceType: 'PROJECT_REVENUE',
				reversals: [],
			});
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.reverse('group-1', 'project-1', 'txn-1', member as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('rejects reversing an already-reversed transaction with 409 (AC-7)', async () => {
			const { prisma } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				sourceRefId: 'project-1',
				sourceType: 'PROJECT_REVENUE',
				reversals: [{ id: 'reversal-1' }],
			});
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.reverse('group-1', 'project-1', 'txn-1', member as never),
			).rejects.toThrow(ConflictException);
		});

		it('reverses a CREDIT (revenue) entry with a DEBIT, guarded against going negative (AC-7)', async () => {
			const { prisma, tx } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				vaultId: 'vault-1',
				direction: 'CREDIT',
				amount: 150,
				type: 'INTERNAL_FLOW',
				sourceType: 'PROJECT_REVENUE',
				sourceRefId: 'project-1',
				reversals: [],
			});
			tx.vault.updateMany.mockResolvedValue({ count: 1 });
			const reversal = { id: 'reversal-1' };
			tx.transaction.create.mockResolvedValue(reversal);
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			const result = await service.reverse(
				'group-1',
				'project-1',
				'txn-1',
				member as never,
			);

			expect(result).toBe(reversal);
			expect(tx.vault.updateMany).toHaveBeenCalledWith({
				where: { id: 'vault-1', cachedBalance: { gte: 150 } },
				data: { cachedBalance: { decrement: 150 } },
			});
			expect(tx.transaction.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					direction: 'DEBIT',
					reversedTransactionId: 'txn-1',
				}),
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_ENTRY_REVERSED' }),
			);
		});

		it('rejects reversing a revenue entry when the destination no longer has enough balance (AC-7)', async () => {
			const { prisma, tx } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				vaultId: 'vault-1',
				direction: 'CREDIT',
				amount: 150,
				type: 'INTERNAL_FLOW',
				sourceType: 'PROJECT_REVENUE',
				sourceRefId: 'project-1',
				reversals: [],
			});
			tx.vault.updateMany.mockResolvedValue({ count: 0 });
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.reverse('group-1', 'project-1', 'txn-1', member as never),
			).rejects.toThrow(UnprocessableEntityException);
		});

		it('reverses a DEBIT (expense) entry with a plain CREDIT, no balance guard needed (AC-7)', async () => {
			const { prisma, tx } = makePrisma();
			prisma.transaction.findFirst.mockResolvedValue({
				id: 'txn-1',
				vaultId: 'vault-1',
				direction: 'DEBIT',
				amount: 40,
				type: 'INTERNAL_FLOW',
				sourceType: 'PROJECT_EXPENSE',
				sourceRefId: 'project-1',
				reversals: [],
			});
			tx.transaction.create.mockResolvedValue({ id: 'reversal-1' });
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await service.reverse('group-1', 'project-1', 'txn-1', member as never);

			expect(tx.vault.update).toHaveBeenCalledWith({
				where: { id: 'vault-1' },
				data: { cachedBalance: { increment: 40 } },
			});
			expect(tx.vault.updateMany).not.toHaveBeenCalled();
			expect(tx.transaction.create).toHaveBeenCalledWith({
				data: expect.objectContaining({ direction: 'CREDIT' }),
			});
		});
	});

	describe('close', () => {
		it('rejects closing a project that is not ACTIVE with 409 (AC-8)', async () => {
			const { prisma } = makePrisma();
			prisma.project.updateMany.mockResolvedValue({ count: 0 });
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			await expect(
				service.close('group-1', 'project-1', member as never),
			).rejects.toThrow(ConflictException);
		});

		it('closes an ACTIVE project via a status-guarded update and never touches vault balances (AC-8)', async () => {
			const { prisma } = makePrisma();
			prisma.project.updateMany.mockResolvedValue({ count: 1 });
			const closed = { ...activeProject, status: 'CLOSED' };
			prisma.project.findUniqueOrThrow.mockResolvedValue(closed);
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			const result = await service.close('group-1', 'project-1', member as never);

			expect(result).toBe(closed);
			expect(prisma.project.updateMany).toHaveBeenCalledWith({
				where: { id: 'project-1', groupId: 'group-1', status: 'ACTIVE' },
				data: { status: 'CLOSED' },
			});
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'PROJECT_CLOSED' }),
			);
		});
	});

	describe('listTransactions', () => {
		it("scopes the ledger to the project's transactions (sourceRefId), optionally filtered by vaultId (AC-9)", async () => {
			const { prisma } = makePrisma();
			prisma.transaction.findMany.mockResolvedValue([{ id: 'txn-1' }]);
			prisma.transaction.count.mockResolvedValue(1);
			const audit = makeAudit();
			const flowRules = makeFlowRules();
			const projects = makeProjects(activeProject);
			const service = new ProjectEntriesService(prisma, audit, flowRules, projects);

			const result = await service.listTransactions('group-1', 'project-1', {
				vaultId: 'vault-1',
			} as never);

			expect(result).toEqual({
				data: [{ id: 'txn-1' }],
				page: 1,
				limit: 20,
				total: 1,
			});
			expect(prisma.transaction.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						groupId: 'group-1',
						sourceRefId: 'project-1',
						vaultId: 'vault-1',
					},
				}),
			);
		});
	});
});
