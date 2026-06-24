import { Public } from '#/common/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@SkipThrottle()
export class AppController {
	@Public()
	@Get('healthz')
	healthz() {
		return { ok: true, ts: Date.now() };
	}
}