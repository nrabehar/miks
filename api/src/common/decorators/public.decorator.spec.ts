import 'reflect-metadata';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
	it('marks a method with the isPublic metadata flag set to true', () => {
		class TestController {
			@Public()
			handler() {}
		}

		const metadata = Reflect.getMetadata(
			IS_PUBLIC_KEY,
			TestController.prototype.handler,
		);

		expect(metadata).toBe(true);
	});

	it('leaves an undecorated method without the isPublic metadata', () => {
		class TestController {
			handler() {}
		}

		const metadata = Reflect.getMetadata(
			IS_PUBLIC_KEY,
			TestController.prototype.handler,
		);

		expect(metadata).toBeUndefined();
	});
});
