import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthenticatedIdentity, AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly authService: AuthService) {
		super({ usernameField: 'identifier', passwordField: 'password' });
	}

	validate(
		identifier: string,
		password: string,
	): Promise<AuthenticatedIdentity> {
		return this.authService.validateLocalLogin(identifier, password);
	}
}
