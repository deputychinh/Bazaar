import type { Server } from 'node:http';

import { ErrorCode } from '@bazaar/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  type INestApplication,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';

import { LogLevel } from '../enums/log-level.enum.js';
import { NotFoundError } from '../errors/not-found.error.js';
import { AppLoggerModule } from '../logger/app-logger.module.js';

import { HttpCommonModule } from './http-common.module.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const createThingSchema = z.object({ name: z.string().min(3) });

@Controller('things')
class ThingsController {
  @Get('missing')
  public missing(): never {
    throw new NotFoundError('Thing', 'thing-1');
  }

  @Get('forbidden')
  public forbidden(): never {
    throw new ForbiddenException('Not yours');
  }

  @Get('broken')
  public broken(): never {
    throw new Error('database password is hunter2');
  }

  @Post()
  public create(@Body(new ZodValidationPipe(createThingSchema)) body: { name: string }): {
    name: string;
  } {
    return body;
  }
}

describe('ProblemDetailsFilter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
        HttpCommonModule,
      ],
      controllers: [ThingsController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps a domain error to its status and code', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/things/missing')
      .set('x-request-id', 'req-123')
      .expect(404);

    expect(response.body).toEqual({
      code: ErrorCode.NotFound,
      message: 'Thing thing-1 was not found',
      status: 404,
      details: { resource: 'Thing', id: 'thing-1' },
      traceId: 'req-123',
    });
  });

  it('maps a framework HTTP exception by its status', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/things/forbidden')
      .expect(403);

    expect(response.body).toMatchObject({ code: ErrorCode.Forbidden, message: 'Not yours' });
  });

  it('hides the message of unexpected errors', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/things/broken')
      .expect(500);

    expect(response.body).toMatchObject({
      code: ErrorCode.Internal,
      message: 'Internal server error',
    });
  });

  it('returns validation issues for an invalid body', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/things')
      .send({ name: 'ab' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: ErrorCode.ValidationFailed,
      details: { issues: [{ path: 'name', message: expect.any(String) }] },
    });
  });

  it('passes a valid body through, parsed', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/things')
      .send({ name: 'lamp', extra: true })
      .expect(201);

    expect(response.body).toEqual({ name: 'lamp' });
  });
});
