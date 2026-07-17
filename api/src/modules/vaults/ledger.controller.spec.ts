import type { GroupMember } from '$prisma/client';
import { LedgerController } from './ledger.controller';
import { SharesService } from './shares.service';
import { TransactionsService } from './transactions.service';

describe('LedgerController', () => {
	const member = {
		id: 'member-1',
		groupId: 'group-1',
		userId: 'user-1',
	} as GroupMember;

	let transactions: Record<string, jest.Mock>;
	let shares: Record<string, jest.Mock>;
	let controller: LedgerController;

	beforeEach(() => {
		transactions = {
			list: jest.fn(),
			reverse: jest.fn(),
			withdraw: jest.fn(),
		};
		shares = { list: jest.fn() };
		controller = new LedgerController(
			transactions as unknown as TransactionsService,
			shares as unknown as SharesService,
		);
	});

	it('list delegates to TransactionsService.list with the group id and query (AC-12)', async () => {
		transactions.list.mockResolvedValue({
			data: [],
			page: 1,
			limit: 20,
			total: 0,
		});

		await controller.list('group-1', { page: 1, limit: 20 });

		expect(transactions.list).toHaveBeenCalledWith('group-1', {
			page: 1,
			limit: 20,
		});
	});

	it('reverse delegates to TransactionsService.reverse with the group id, transaction id, and caller (AC-11)', async () => {
		transactions.reverse.mockResolvedValue({ id: 'tx-2' });

		await controller.reverse('group-1', 'tx-1', member);

		expect(transactions.reverse).toHaveBeenCalledWith(
			'group-1',
			'tx-1',
			member,
		);
	});

	it('withdraw delegates to TransactionsService.withdraw with the group id, caller, and dto (AC-9)', async () => {
		const dto = { amount: 50 };
		transactions.withdraw.mockResolvedValue({ id: 'tx-1' });

		await controller.withdraw('group-1', member, dto);

		expect(transactions.withdraw).toHaveBeenCalledWith(
			'group-1',
			member,
			dto,
		);
	});

	it('listShares delegates to SharesService.list with the group id (AC-12)', async () => {
		shares.list.mockResolvedValue([]);

		await controller.listShares('group-1');

		expect(shares.list).toHaveBeenCalledWith('group-1');
	});
});
