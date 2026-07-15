import { Prisma } from '$prisma/client';
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common';

const STATUS_BY_CODE: Record<string, number> = {
	P2002: HttpStatus.CONFLICT,
	P2025: HttpStatus.NOT_FOUND,
	P2003: HttpStatus.BAD_REQUEST,
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
	catch(
		exception: Prisma.PrismaClientKnownRequestError,
		host: ArgumentsHost,
	) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.BAD_REQUEST;
		const target = (exception.meta?.target as string[] | undefined)?.join(
			', ',
		);

		const message =
			exception.code === 'P2002'
				? `A record with this ${target ?? 'value'} already exists`
				: exception.code === 'P2025'
					? 'Record not found'
					: 'Database request error';

		response.status(status).json({
			success: false,
			statusCode: status,
			message,
			error: exception.code,
			path: request.url,
			timestamp: new Date().toISOString(),
		});
	}
}
