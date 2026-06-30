import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private store!: Keyv;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('redis.url', 'redis://localhost:6379');
    const adapter = new KeyvRedis(url);
    this.store = new Keyv({ store: adapter, namespace: 'miks' });
    this.store.on('error', (err) => console.error('[Redis]', err));
  }

  async onModuleDestroy() {
    await (this.store as any)?.disconnect?.();
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.store.set(key, value, ttlMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get<T>(key);
  }

  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}
