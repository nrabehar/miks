import { Public } from '#/common/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class AppController {
	@Public()
	// Bypass all named throttler buckets (ttl=0, limit=0 = effectively disabled)
	@Throttle({ default: { ttl: 1, limit: 1_000_000 } })
	@Get('healthz')
	healthz() {
		return { ok: true, ts: Date.now() };
	}
}