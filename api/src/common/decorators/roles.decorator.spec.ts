import 'reflect-metadata';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
	it('attaches the given roles as metadata on the method', () => {
		class TestController {
			@Roles('ADMIN')
			handler() {}
		}

		const metadata = Reflect.getMetadata(
			ROLES_KEY,
			TestController.prototype.handler,
		);

		expect(metadata).toEqual(['ADMIN']);
	});

	it('supports multiple roles', () => {
		class TestController {
			@Roles('ADMIN', 'USER')
			handler() {}
		}

		const metadata = Reflect.getMetadata(
			ROLES_KEY,
			TestController.prototype.handler,
		);

		expect(metadata).toEqual(['ADMIN', 'USER']);
	});

	it('leaves an undecorated method without roles metadata', () => {
		class TestController {
			handler() {}
		}

		const metadata = Reflect.getMetadata(
			ROLES_KEY,
			TestController.prototype.handler,
		);

		expect(metadata).toBeUndefined();
	});
});
