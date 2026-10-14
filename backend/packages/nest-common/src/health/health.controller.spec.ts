import type { Server } from 'node:http';

import { type INestApplication, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { HealthStatus } from '../enums/health-status.enum.js';
import { LogLevel } from '../enums/log-level.enum.js';
import { AppLoggerModule } from '../logger/app-logger.module.js';

import { HealthIndicator } from './health-indicator.js';
import { HealthModule } from './health.module.js';

@Injectable()
class DatabaseIndicator extends HealthIndicator {
  public readonly name = 'database';
  public check = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
}

@Injectable()
class KafkaIndicator extends HealthIndicator {
  public readonly name = 'kafka';
  public override readonly critical = false;
  public check = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
}

describe('HealthController', () => {
  let app: INestApplication;
  let kafka: KafkaIndicator;
  let database: DatabaseIndicator;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
        HealthModule.forRoot([DatabaseIndicator, KafkaIndicator]),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    kafka = moduleRef.get(KafkaIndicator);
    database = moduleRef.get(DatabaseIndicator);
  });

  afterEach(async () => {
    await app.close();
  });

  it('reports the process as live without checking dependencies', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/health/live')
      .expect(200);

    expect(response.body).toEqual({ status: HealthStatus.Up });
    expect(kafka.check).not.toHaveBeenCalled();
  });

  it('is ready when every dependency answers', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/health/ready')
      .expect(200);

    expect(response.body).toMatchObject({
      status: HealthStatus.Up,
      checks: [
        { name: 'database', status: HealthStatus.Up },
        { name: 'kafka', status: HealthStatus.Up },
      ],
    });
  });

  it('returns 503 and the failing check when a critical dependency is down', async () => {
    database.check.mockRejectedValue(new Error('connection refused'));

    const response = await request(app.getHttpServer() as Server)
      .get('/health/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      status: HealthStatus.Down,
      checks: [
        { name: 'database', status: HealthStatus.Down, error: 'connection refused' },
        { name: 'kafka', status: HealthStatus.Up },
      ],
    });
  });

  it('stays ready but degraded while a non-critical dependency (Kafka) is down', async () => {
    kafka.check.mockRejectedValue(new Error('broker unreachable'));

    const response = await request(app.getHttpServer() as Server)
      .get('/health/ready')
      .expect(200);

    expect(response.body).toMatchObject({
      status: HealthStatus.Degraded,
      checks: [
        { name: 'database', status: HealthStatus.Up },
        { name: 'kafka', status: HealthStatus.Down, error: 'broker unreachable' },
      ],
    });
  });
});
