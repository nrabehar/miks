import { Public } from '#/common/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
	@Public()
	@Get('healthz')
	healthz() {
		return { ok: true, ts: Date.now() };
	}
}