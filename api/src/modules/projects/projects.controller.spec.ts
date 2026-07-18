import type { GroupMember } from '$prisma/client';
import { ProjectEntriesService } from './project-entries.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
	const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' } as GroupMember;

	let projects: Record<string, jest.Mock>;
	let entries: Record<string, jest.Mock>;
	let controller: ProjectsController;

	beforeEach(() => {
		projects = {
			submit: jest.fn(),
			list: jest.fn(),
			get: jest.fn(),
			reopenVote: jest.fn(),
		};
		entries = {
			recordRevenue: jest.fn(),
			recordExpense: jest.fn(),
			reverse: jest.fn(),
			close: jest.fn(),
			listTransactions: jest.fn(),
		};
		controller = new ProjectsController(
			projects as unknown as ProjectsService,
			entries as unknown as ProjectEntriesService,
		);
	});

	it('submit delegates to ProjectsService.submit with groupId, the caller member, and the dto (AC-1)', async () => {
		const dto = { title: 'Garden' };
		projects.submit.mockResolvedValue({ id: 'project-1' });

		const result = await controller.submit('group-1', member, dto as never);

		expect(projects.submit).toHaveBeenCalledWith('group-1', member, dto);
		expect(result).toEqual({ id: 'project-1' });
	});

	it('list delegates to ProjectsService.list with groupId and the query (AC-9)', async () => {
		projects.list.mockResolvedValue({ data: [], page: 1, limit: 20, total: 0 });

		await controller.list('group-1', { page: 1, limit: 20 });

		expect(projects.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('get delegates to ProjectsService.get with groupId and the project id (AC-9)', async () => {
		projects.get.mockResolvedValue({ id: 'project-1' });

		await controller.get('group-1', 'project-1');

		expect(projects.get).toHaveBeenCalledWith('group-1', 'project-1');
	});

	it('reopenVote delegates to ProjectsService.reopenVote (AC-2)', async () => {
		await controller.reopenVote('group-1', 'project-1', member);

		expect(projects.reopenVote).toHaveBeenCalledWith(
			'group-1',
			'project-1',
			member,
		);
	});

	it('recordRevenue delegates to ProjectEntriesService.recordRevenue (AC-5)', async () => {
		const dto = { amount: 100 };

		await controller.recordRevenue('group-1', 'project-1', member, dto as never);

		expect(entries.recordRevenue).toHaveBeenCalledWith(
			'group-1',
			'project-1',
			member,
			dto,
		);
	});

	it('recordExpense delegates to ProjectEntriesService.recordExpense (AC-6)', async () => {
		const dto = { amount: 50 };

		await controller.recordExpense('group-1', 'project-1', member, dto as never);

		expect(entries.recordExpense).toHaveBeenCalledWith(
			'group-1',
			'project-1',
			member,
			dto,
		);
	});

	it('reverseEntry delegates to ProjectEntriesService.reverse (AC-7)', async () => {
		await controller.reverseEntry('group-1', 'project-1', 'txn-1', member);

		expect(entries.reverse).toHaveBeenCalledWith(
			'group-1',
			'project-1',
			'txn-1',
			member,
		);
	});

	it('close delegates to ProjectEntriesService.close (AC-8)', async () => {
		await controller.close('group-1', 'project-1', member);

		expect(entries.close).toHaveBeenCalledWith('group-1', 'project-1', member);
	});

	it('listTransactions delegates to ProjectEntriesService.listTransactions (AC-9)', async () => {
		const query = { page: 1, limit: 20 };

		await controller.listTransactions('group-1', 'project-1', query as never);

		expect(entries.listTransactions).toHaveBeenCalledWith(
			'group-1',
			'project-1',
			query,
		);
	});
});
