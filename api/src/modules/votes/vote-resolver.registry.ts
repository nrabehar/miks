import type { VoteSubjectType } from '$prisma/client';
import { Injectable } from '@nestjs/common';
import type { VoteResolver } from './vote-resolver.interface';

/**
 * The resolver registry lets GroupsModule and ProjectsModule each register
 * their own VoteResolver at startup without either module importing the
 * other, breaking the circular dependency a shared Vote/VoteResponse model
 * would otherwise create (spec 0004, AC-13 / Decision).
 */
@Injectable()
export class VoteResolverRegistry {
	private readonly resolvers = new Map<VoteSubjectType, VoteResolver>();

	register(resolver: VoteResolver): void {
		this.resolvers.set(resolver.subjectType, resolver);
	}

	get(subjectType: VoteSubjectType): VoteResolver | undefined {
		return this.resolvers.get(subjectType);
	}
}
