import { PrismaModule } from "#/core/prisma/prisma.module";
import { RedisModule } from "#/core/redis/redis.module";
import { Module } from "@nestjs/common";
import { SessionBlacklistService } from "./session-blacklist.service";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

@Module({
	imports: [PrismaModule, RedisModule],
	controllers: [SessionController],
	providers: [SessionService, SessionBlacklistService],
	exports: [SessionService, SessionBlacklistService],
})
export class SessionModule {}