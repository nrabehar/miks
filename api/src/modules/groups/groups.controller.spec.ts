import type { AuthenticatedUser } from '$common/guards/jwt-auth.guard';
import type { GroupMember } from '$prisma/client';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitesService } from './invites.service';
import { RemovalVotesService } from './removal-votes.service';

describe('GroupsController', () => {
	const user: AuthenticatedUser = {
		id: 'user-1',
		email: 'ada@example.test',
		phone: null,
		displayName: 'Ada',
		role: 'USER',
		emailVerified: true,
	};
	const member = {
		id: 'member-1',
		groupId: 'group-1',
		userId: 'user-1',
	} as GroupMember;

	let groups: Record<string, jest.Mock>;
	let invites: Record<string, jest.Mock>;
	let votes: Record<string, jest.Mock>;
	let controller: GroupsController;

	beforeEach(() => {
		groups = {
			create: jest.fn(),
			listForUser: jest.fn(),
			get: jest.fn(),
			update: jest.fn(),
			listMembers: jest.fn(),
			leave: jest.fn(),
			close: jest.fn(),
		};
		invites = {
			create: jest.fn(),
			list: jest.fn(),
			revoke: jest.fn(),
		};
		votes = { proposeRemoval: jest.fn(), listOpen: jest.fn() };

		controller = new GroupsController(
			groups as unknown as GroupsService,
			invites as unknown as InvitesService,
			votes as unknown as RemovalVotesService,
		);
	});

	it('create delegates to GroupsService.create with the caller id (AC-1)', async () => {
		groups.create.mockResolvedValue({ id: 'group-1' });
		const dto = { name: 'My Group', currencyCode: 'MGA' };

		const result = await controller.create(user, dto);

		expect(groups.create).toHaveBeenCalledWith('user-1', dto);
		expect(result).toEqual({ id: 'group-1' });
	});

	it('list delegates to GroupsService.listForUser with the caller id and query', async () => {
		groups.listForUser.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.list(user, { page: 1, limit: 20 });

		expect(groups.listForUser).toHaveBeenCalledWith('user-1', {
			page: 1,
			limit: 20,
		});
	});

	it('get delegates to GroupsService.get with the route param', async () => {
		groups.get.mockResolvedValue({ id: 'group-1' });

		await controller.get('group-1');

		expect(groups.get).toHaveBeenCalledWith('group-1');
	});

	it('update delegates to GroupsService.update with id, caller id, and dto (AC-12)', async () => {
		const dto = { name: 'Renamed' };
		groups.update.mockResolvedValue({ id: 'group-1', name: 'Renamed' });

		await controller.update('group-1', user, dto);

		expect(groups.update).toHaveBeenCalledWith('group-1', 'user-1', dto);
	});

	it('listMembers delegates to GroupsService.listMembers', async () => {
		groups.listMembers.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.listMembers('group-1', { page: 1, limit: 20 });

		expect(groups.listMembers).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it("leave delegates to GroupsService.leave with the caller's membership (AC-7)", async () => {
		await controller.leave('group-1', member);

		expect(groups.leave).toHaveBeenCalledWith('group-1', member);
	});

	it('close delegates to GroupsService.close (AC-8)', async () => {
		groups.close.mockResolvedValue({ id: 'group-1', status: 'CLOSED' });

		await controller.close('group-1', member);

		expect(groups.close).toHaveBeenCalledWith('group-1', member);
	});

	it('createInvite delegates to InvitesService.create (AC-2)', async () => {
		const dto = { email: 'invitee@example.test' };
		invites.create.mockResolvedValue({ id: 'invite-1' });

		await controller.createInvite('group-1', member, dto);

		expect(invites.create).toHaveBeenCalledWith('group-1', member, dto);
	});

	it('listInvites delegates to InvitesService.list', async () => {
		invites.list.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.listInvites('group-1', { page: 1, limit: 20 });

		expect(invites.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('revokeInvite delegates to InvitesService.revoke (AC-4)', async () => {
		await controller.revokeInvite('group-1', 'invite-1', member);

		expect(invites.revoke).toHaveBeenCalledWith(
			'group-1',
			'invite-1',
			member,
		);
	});

	it("proposeRemovalVote delegates to VotesService.proposeRemoval using the caller's own group id (AC-9)", async () => {
		const dto = { approvalThreshold: 50, minQuorum: 2, durationHours: 24 };
		votes.proposeRemoval.mockResolvedValue({ id: 'vote-1' });

		await controller.proposeRemovalVote('target-1', member, dto);

		expect(votes.proposeRemoval).toHaveBeenCalledWith(
			member.groupId,
			'target-1',
			member,
			dto,
		);
	});

	it('listRemovalVotes delegates to RemovalVotesService.listOpen (AC-15)', async () => {
		votes.listOpen.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.listRemovalVotes('group-1', { page: 1, limit: 20 });

		expect(votes.listOpen).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});
});
