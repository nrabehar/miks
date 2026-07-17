import type { GroupMember } from '$prisma/client';
import { FlowRulesController } from './flow-rules.controller';
import { FlowRulesService } from './flow-rules.service';

describe('FlowRulesController', () => {
	const member = {
		id: 'member-1',
		groupId: 'group-1',
		userId: 'user-1',
	} as GroupMember;

	let flowRules: Record<string, jest.Mock>;
	let controller: FlowRulesController;

	beforeEach(() => {
		flowRules = {
			create: jest.fn(),
			list: jest.fn(),
			replace: jest.fn(),
		};
		controller = new FlowRulesController(
			flowRules as unknown as FlowRulesService,
		);
	});

	it('create delegates to FlowRulesService.create with the group id, caller, and dto (AC-4)', async () => {
		const dto = {
			sourceType: 'CONTRIBUTION' as const,
			destinations: [
				{
					destinationType: 'VAULT' as const,
					vaultId: 'vault-1',
					percentage: 100,
				},
			],
		};
		flowRules.create.mockResolvedValue({ id: 'rule-1' });

		const result = await controller.create('group-1', member, dto);

		expect(flowRules.create).toHaveBeenCalledWith('group-1', member, dto);
		expect(result).toEqual({ id: 'rule-1' });
	});

	it('list delegates to FlowRulesService.list with the group id and query', async () => {
		flowRules.list.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.list('group-1', { page: 1, limit: 20 });

		expect(flowRules.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('replace delegates to FlowRulesService.replace with the group id, rule id, caller, and dto (AC-8)', async () => {
		const dto = {
			destinations: [
				{
					destinationType: 'VAULT' as const,
					vaultId: 'vault-1',
					percentage: 100,
				},
			],
		};
		flowRules.replace.mockResolvedValue({
			id: 'rule-2',
			replacesRuleId: 'rule-1',
		});

		await controller.replace('group-1', 'rule-1', member, dto);

		expect(flowRules.replace).toHaveBeenCalledWith(
			'group-1',
			'rule-1',
			member,
			dto,
		);
	});
});
