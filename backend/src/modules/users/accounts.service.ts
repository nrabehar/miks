import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class AccountsService {
  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(16).toString('hex');
    const hash = await argon2.hash(password + salt);
    return { hash, salt };
  }

  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password + salt);
    } catch {
      return false;
    }
  }
}
