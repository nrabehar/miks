import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
	await prisma.authProvider.createMany({
		data: [
			{ code: 'local', name: 'Local', category: 'LOCAL' },
			{ code: 'google', name: 'Google', category: 'OAUTH' },
			{ code: 'facebook', name: 'Facebook', category: 'OAUTH' },
		],
		skipDuplicates: true,
	});

	await prisma.verificationTokenPurpose.createMany({
		data: [
			{ code: 'EMAIL_VERIFICATION', name: 'Email verification' },
			{ code: 'PASSWORD_RESET', name: 'Password reset' },
			{ code: 'NEW_DEVICE_CONFIRMATION', name: 'New device confirmation' },
		],
		skipDuplicates: true,
	});

	await prisma.currency.createMany({
		data: [
			{ code: 'MGA', name: 'Malagasy ariary', symbol: 'Ar' },
			{ code: 'USD', name: 'US dollar', symbol: '$' },
			{ code: 'EUR', name: 'Euro', symbol: '€' },
		],
		skipDuplicates: true,
	});

	await prisma.eventType.createMany({
		data: [
			{ code: 'GROUP_CREATED', category: 'MEMBER', description: 'Group created' },
			{ code: 'GROUP_EDITED', category: 'MEMBER', description: 'Group name/description/currency edited' },
			{ code: 'GROUP_CLOSED', category: 'MEMBER', description: 'Group closed by its last active member' },
			{ code: 'INVITE_SENT', category: 'MEMBER', description: 'Group invite sent by email' },
			{ code: 'INVITE_ACCEPTED', category: 'MEMBER', description: 'Group invite accepted, new membership created' },
			{ code: 'INVITE_REVOKED', category: 'MEMBER', description: 'Pending group invite revoked' },
			{ code: 'INVITE_EXPIRED', category: 'MEMBER', description: 'Group invite expired (checked lazily)' },
			{ code: 'MEMBER_LEFT', category: 'MEMBER', description: 'Member left a group voluntarily' },
			{ code: 'MEMBER_REMOVAL_VOTE_PROPOSED', category: 'MEMBER', description: 'Removal vote proposed against a member' },
			{ code: 'MEMBER_REMOVAL_VOTE_DECIDED', category: 'MEMBER', description: 'Removal vote decided (approved/rejected/invalid)' },
			{ code: 'MEMBER_REMOVED', category: 'MEMBER', description: 'Member removed following an approved removal vote' },
			{ code: 'VAULT_CREATED', category: 'FINANCIAL', description: 'A group vault created by a member' },
			{ code: 'CONTRIBUTION_RECORDED', category: 'FINANCIAL', description: 'A member recorded a contribution' },
			{ code: 'CONTRIBUTION_REVERSED', category: 'FINANCIAL', description: 'A contribution and its distribution transactions reversed' },
			{ code: 'FLOW_RULE_CREATED', category: 'FINANCIAL', description: 'A flow rule created for a group' },
			{ code: 'FLOW_RULE_REPLACED', category: 'FINANCIAL', description: 'A flow rule replaced by a new version' },
			{ code: 'WITHDRAWAL_DECLARED', category: 'FINANCIAL', description: 'A member declared a withdrawal from their withdrawable vault' },
			{ code: 'TRANSACTION_REVERSED', category: 'FINANCIAL', description: 'A single transaction reversed' },
			{ code: 'GROUP_VOTE_CONFIG_UPDATED', category: 'CONFIGURATION', description: "A group's default vote config (approvalThreshold/minQuorum/durationHours) updated" },
			{ code: 'PROJECT_SUBMITTED', category: 'PROJECT', description: 'A project submitted for approval' },
			{ code: 'PROJECT_APPROVED', category: 'PROJECT', description: "A project's approval vote passed threshold" },
			{ code: 'PROJECT_REJECTED', category: 'PROJECT', description: "A project's approval vote failed threshold" },
			{ code: 'PROJECT_ACTIVATED', category: 'PROJECT', description: 'A project moved from APPROVED to ACTIVE once its payout succeeded' },
			{ code: 'PROJECT_CLOSED', category: 'PROJECT', description: 'An ACTIVE project closed by a member' },
			{ code: 'PROJECT_VOTE_OPENED', category: 'VOTE', description: "A project's approval vote opened at submission" },
			{ code: 'PROJECT_VOTE_REOPENED', category: 'VOTE', description: 'A fresh vote session opened for a still-PENDING project after an INVALID vote' },
			{ code: 'PROJECT_VOTE_DECIDED', category: 'VOTE', description: "A project's approval vote resolved (APPROVED/REJECTED/INVALID)" },
			{ code: 'PROJECT_PAYOUT_ISSUED', category: 'FINANCIAL', description: "A project's requested budget paid out from its sourceVault into its payoutVault" },
			{ code: 'PROJECT_REVENUE_RECORDED', category: 'FINANCIAL', description: 'A project revenue entry recorded and distributed' },
			{ code: 'PROJECT_EXPENSE_RECORDED', category: 'FINANCIAL', description: 'A project expense entry recorded and distributed' },
			{ code: 'PROJECT_ENTRY_REVERSED', category: 'FINANCIAL', description: 'A project revenue or expense entry reversed' },
		],
		skipDuplicates: true,
	});
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
