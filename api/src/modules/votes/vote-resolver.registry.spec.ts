import type { VoteResolver } from './vote-resolver.interface';
import { VoteResolverRegistry } from './vote-resolver.registry';

function makeResolver(subjectType: 'MEMBER_REMOVAL' | 'PROJECT'): VoteResolver {
	return {
		subjectType,
		onResolved: jest.fn(),
		afterResolved: jest.fn(),
	} as unknown as VoteResolver;
}

describe('VoteResolverRegistry', () => {
	it('returns undefined for a subjectType with no registered resolver', () => {
		const registry = new VoteResolverRegistry();

		expect(registry.get('PROJECT')).toBeUndefined();
	});

	it('returns the resolver registered for its own subjectType', () => {
		const registry = new VoteResolverRegistry();
		const projectResolver = makeResolver('PROJECT');

		registry.register(projectResolver);

		expect(registry.get('PROJECT')).toBe(projectResolver);
	});

	it('keeps resolvers for different subjectTypes independent', () => {
		const registry = new VoteResolverRegistry();
		const projectResolver = makeResolver('PROJECT');
		const removalResolver = makeResolver('MEMBER_REMOVAL');

		registry.register(projectResolver);
		registry.register(removalResolver);

		expect(registry.get('PROJECT')).toBe(projectResolver);
		expect(registry.get('MEMBER_REMOVAL')).toBe(removalResolver);
	});

	it('replaces a previously registered resolver for the same subjectType', () => {
		const registry = new VoteResolverRegistry();
		const first = makeResolver('PROJECT');
		const second = makeResolver('PROJECT');

		registry.register(first);
		registry.register(second);

		expect(registry.get('PROJECT')).toBe(second);
	});
});
