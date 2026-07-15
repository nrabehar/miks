import { PasswordService } from './password.service';

describe('PasswordService', () => {
	let service: PasswordService;

	beforeEach(() => {
		service = new PasswordService();
	});

	describe('hash', () => {
		it('returns an argon2id hash string, not the plain password', async () => {
			const hash = await service.hash('correct-horse-battery');

			expect(hash).not.toBe('correct-horse-battery');
			expect(hash).toMatch(/^\$argon2id\$/);
		});

		it('produces a different hash each time for the same password (salted)', async () => {
			const [first, second] = await Promise.all([
				service.hash('same-password'),
				service.hash('same-password'),
			]);

			expect(first).not.toBe(second);
		});
	});

	describe('verify', () => {
		it('returns true when the plain password matches the hash', async () => {
			const hash = await service.hash('correct-horse-battery');

			await expect(service.verify(hash, 'correct-horse-battery')).resolves.toBe(
				true,
			);
		});

		it('returns false when the plain password does not match the hash', async () => {
			const hash = await service.hash('correct-horse-battery');

			await expect(service.verify(hash, 'wrong-password')).resolves.toBe(
				false,
			);
		});

		it('returns false for an empty password against a real hash', async () => {
			const hash = await service.hash('correct-horse-battery');

			await expect(service.verify(hash, '')).resolves.toBe(false);
		});

		it('rejects when the hash is not a valid argon2 hash', async () => {
			await expect(
				service.verify('not-a-real-hash', 'anything'),
			).rejects.toThrow();
		});
	});
});
