import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

describe('InvitesController', () => {
	const user: AuthenticatedUser = {
		id: 'user-1',
		email: 'ada@example.test',
		phone: null,
		displayName: 'Ada',
		role: 'USER',
		emailVerified: true,
	};

	let invites: Record<string, jest.Mock>;
	let controller: InvitesController;

	beforeEach(() => {
		invites = { preview: jest.fn(), accept: jest.fn() };
		controller = new InvitesController(invites as unknown as InvitesService);
	});

	it('preview delegates to InvitesService.preview with the raw token (AC-2)', async () => {
		invites.preview.mockResolvedValue({ groupName: 'My Group' });

		const result = await controller.preview('raw-token');

		expect(invites.preview).toHaveBeenCalledWith('raw-token');
		expect(result).toEqual({ groupName: 'My Group' });
	});

	it('accept delegates to InvitesService.accept with the token, caller id, and caller email (AC-3)', async () => {
		invites.accept.mockResolvedValue({ id: 'member-1' });

		await controller.accept('raw-token', user);

		expect(invites.accept).toHaveBeenCalledWith(
			'raw-token',
			'user-1',
			'ada@example.test',
		);
	});
});
