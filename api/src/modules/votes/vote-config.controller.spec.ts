import type { GroupMember } from '$prisma/client';
import { VoteConfigController } from './vote-config.controller';
import { VoteConfigService } from './vote-config.service';

describe('VoteConfigController', () => {
	const member = { id: 'member-1', groupId: 'group-1', userId: 'user-1' } as GroupMember;

	let voteConfig: Record<string, jest.Mock>;
	let controller: VoteConfigController;

	beforeEach(() => {
		voteConfig = { update: jest.fn() };
		controller = new VoteConfigController(voteConfig as unknown as VoteConfigService);
	});

	it('update delegates to VoteConfigService.update with groupId, the caller member, and the dto', async () => {
		const dto = { minQuorum: 3 };
		voteConfig.update.mockResolvedValue({
			approvalThreshold: 50,
			minQuorum: 3,
			durationHours: 72,
		});

		const result = await controller.update('group-1', member, dto as never);

		expect(voteConfig.update).toHaveBeenCalledWith('group-1', member, dto);
		expect(result).toEqual({
			approvalThreshold: 50,
			minQuorum: 3,
			durationHours: 72,
		});
	});
});
