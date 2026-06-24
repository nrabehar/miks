export enum VerificationContext {
	EMAIL_CONFIRMATION = 'EMAIL_CONFIRMATION',
	PASSWORD_RESET = 'PASSWORD_RESET',
	TRANSACTION_VALIDATION = 'TRANSACTION_VALIDATION',
	'2FA_LOGIN' = '2FA_LOGIN',
}

export interface VerificationMailPayload {
	to: string;
	name: string;
	code: string;
	context: VerificationContext;
	extraDetails?: string;
	expirationTime?: string;
	resetLink?: string;
}
