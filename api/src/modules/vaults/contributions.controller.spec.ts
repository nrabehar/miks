import type { GroupMember } from '$prisma/client';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';

describe('ContributionsController', () => {
	const member = {
		id: 'member-1',
		groupId: 'group-1',
		userId: 'user-1',
	} as GroupMember;

	let contributions: Record<string, jest.Mock>;
	let controller: ContributionsController;

	beforeEach(() => {
		contributions = {
			create: jest.fn(),
			list: jest.fn(),
			reverse: jest.fn(),
		};
		controller = new ContributionsController(
			contributions as unknown as ContributionsService,
		);
	});

	it('create delegates to ContributionsService.create with the group id, caller, and dto (AC-3)', async () => {
		const dto = { amount: 100 };
		contributions.create.mockResolvedValue({ id: 'contrib-1' });

		const result = await controller.create('group-1', member, dto);

		expect(contributions.create).toHaveBeenCalledWith(
			'group-1',
			member,
			dto,
		);
		expect(result).toEqual({ id: 'contrib-1' });
	});

	it('list delegates to ContributionsService.list with the group id and query', async () => {
		contributions.list.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.list('group-1', { page: 1, limit: 20 });

		expect(contributions.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('reverse delegates to ContributionsService.reverse with the group id, contribution id, and caller (AC-14)', async () => {
		contributions.reverse.mockResolvedValue({
			id: 'contrib-1',
			reversedAt: new Date(),
		});

		await controller.reverse('group-1', 'contrib-1', member);

		expect(contributions.reverse).toHaveBeenCalledWith(
			'group-1',
			'contrib-1',
			member,
		);
	});
});
