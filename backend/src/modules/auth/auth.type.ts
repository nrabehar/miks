import { User } from "#prisma/client";

export interface UserLoginResult {
	user: User;
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
