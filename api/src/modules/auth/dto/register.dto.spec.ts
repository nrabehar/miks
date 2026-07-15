import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function errorsFor(input: Record<string, unknown>) {
	const dto = plainToInstance(RegisterDto, input);
	return validate(dto);
}

describe('RegisterDto', () => {
	it('is valid with an email, a long enough password, and a displayName', async () => {
		const errors = await errorsFor({
			email: 'ada@example.test',
			password: 'super-secret-1',
			displayName: 'Ada',
		});

		expect(errors).toHaveLength(0);
	});

	it('is valid with a phone instead of an email', async () => {
		const errors = await errorsFor({
			phone: '+261340000000',
			password: 'super-secret-1',
			displayName: 'Ada',
		});

		expect(errors).toHaveLength(0);
	});

	it('is valid when both email and phone are provided', async () => {
		const errors = await errorsFor({
			email: 'ada@example.test',
			phone: '+261340000000',
			password: 'super-secret-1',
			displayName: 'Ada',
		});

		expect(errors).toHaveLength(0);
	});

	it('fails when neither email nor phone is provided', async () => {
		const errors = await errorsFor({
			password: 'super-secret-1',
			displayName: 'Ada',
		});

		const properties = errors.map((error) => error.property);
		expect(properties).toEqual(expect.arrayContaining(['email', 'phone']));
	});

	it('fails when the password is shorter than 8 characters', async () => {
		const errors = await errorsFor({
			email: 'ada@example.test',
			password: 'short',
			displayName: 'Ada',
		});

		const passwordError = errors.find((error) => error.property === 'password');
		expect(passwordError?.constraints).toHaveProperty('minLength');
	});

	it('fails when displayName is missing', async () => {
		const errors = await errorsFor({
			email: 'ada@example.test',
			password: 'super-secret-1',
		});

		const properties = errors.map((error) => error.property);
		expect(properties).toContain('displayName');
	});
});
