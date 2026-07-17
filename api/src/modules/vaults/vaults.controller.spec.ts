import type { GroupMember } from '$prisma/client';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';

describe('VaultsController', () => {
	const member = {
		id: 'member-1',
		groupId: 'group-1',
		userId: 'user-1',
	} as GroupMember;

	let vaults: Record<string, jest.Mock>;
	let controller: VaultsController;

	beforeEach(() => {
		vaults = {
			createGroupVault: jest.fn(),
			list: jest.fn(),
			get: jest.fn(),
		};
		controller = new VaultsController(vaults as unknown as VaultsService);
	});

	it('create delegates to VaultsService.createGroupVault with the group id, caller, and dto (AC-1)', async () => {
		const dto = { name: 'Reserve' };
		vaults.createGroupVault.mockResolvedValue({ id: 'vault-1' });

		const result = await controller.create('group-1', member, dto);

		expect(vaults.createGroupVault).toHaveBeenCalledWith(
			'group-1',
			member,
			dto,
		);
		expect(result).toEqual({ id: 'vault-1' });
	});

	it('list delegates to VaultsService.list with the group id and query', async () => {
		vaults.list.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.list('group-1', { page: 1, limit: 20 });

		expect(vaults.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('get delegates to VaultsService.get with the group id and vault id', async () => {
		vaults.get.mockResolvedValue({ id: 'vault-1' });

		await controller.get('group-1', 'vault-1');

		expect(vaults.get).toHaveBeenCalledWith('group-1', 'vault-1');
	});
});
