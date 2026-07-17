import type { PrismaService } from '$lib/database/prisma.service';
import { AuditService } from './audit.service';

function makePrisma() {
	return {
		auditLog: {
			create: jest.fn().mockResolvedValue({}),
		},
	} as unknown as PrismaService & { auditLog: { create: jest.Mock } };
}

describe('AuditService', () => {
	it('writes an audit log row with the given event type, group, actor, and payload (AC-14)', async () => {
		const prisma = makePrisma();
		const service = new AuditService(prisma);

		await service.log({
			eventType: 'GROUP_CREATED',
			groupId: 'group-1',
			actorId: 'user-1',
			payload: { name: 'My Group' },
		});

		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: {
				eventType: 'GROUP_CREATED',
				groupId: 'group-1',
				actorId: 'user-1',
				payload: { name: 'My Group' },
			},
		});
	});

	it('defaults payload to an empty object when none is given', async () => {
		const prisma = makePrisma();
		const service = new AuditService(prisma);

		await service.log({ eventType: 'GROUP_CLOSED', groupId: 'group-1' });

		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: {
				eventType: 'GROUP_CLOSED',
				groupId: 'group-1',
				actorId: undefined,
				payload: {},
			},
		});
	});

	it('allows a groupless, actorless event (a system level entry)', async () => {
		const prisma = makePrisma();
		const service = new AuditService(prisma);

		await service.log({ eventType: 'INVITE_EXPIRED' });

		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: {
				eventType: 'INVITE_EXPIRED',
				groupId: undefined,
				actorId: undefined,
				payload: {},
			},
		});
	});
});
