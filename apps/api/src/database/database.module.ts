import { Global, Module, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@telepharmacy/db';
import { DRIZZLE } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('database.url');
        const client = postgres(url, { max: 10 });
        const db = drizzle(client, { schema });
        (db as any).__client = client;
        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly config: ConfigService) {}

  async onApplicationShutdown() {
    this.logger.log('Closing database connections...');
    // postgres.js connections close automatically when the process exits,
    // but we log it for observability
  }
}
