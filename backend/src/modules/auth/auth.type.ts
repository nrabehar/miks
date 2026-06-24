import { User } from "#prisma/client";

export interface AuthUserDto {
	id: string;
	email: string;
	phone?: string;
	displayName?: string;
	emailVerified: boolean;
	phoneVerified: boolean;
	twoFaEnabled: boolean;
}

export interface UserLoginResult {
	user: AuthUserDto;
	accessToken: string;
	refreshToken: string;
}

export interface UserRefreshResult {
	accessToken: string;
	refreshToken: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}
