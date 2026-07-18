import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

describe('VotesController', () => {
	const user: AuthenticatedUser = {
		id: 'user-1',
		email: 'ada@example.test',
		phone: null,
		displayName: 'Ada',
		role: 'USER',
	};

	let votes: Record<string, jest.Mock>;
	let controller: VotesController;

	beforeEach(() => {
		votes = { get: jest.fn(), respond: jest.fn() };
		controller = new VotesController(votes as unknown as VotesService);
	});

	it('get delegates to VotesService.get with the vote id and caller id (AC-11)', async () => {
		votes.get.mockResolvedValue({ id: 'vote-1', tally: { FOR: 0, AGAINST: 0, ABSTAIN: 0 } });

		await controller.get('vote-1', user);

		expect(votes.get).toHaveBeenCalledWith('vote-1', 'user-1');
	});

	it('respond delegates to VotesService.respond with the vote id, caller id, and choice (AC-10)', async () => {
		votes.respond.mockResolvedValue({ id: 'response-1', choice: 'FOR' });

		await controller.respond('vote-1', user, { choice: 'FOR' as never });

		expect(votes.respond).toHaveBeenCalledWith('vote-1', 'user-1', 'FOR');
	});
});
