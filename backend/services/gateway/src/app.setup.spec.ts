import type { Server } from 'node:http';

import { Controller, Get, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';

import { AppSetup } from './app.setup.js';
import type { GatewayEnv } from './config/env.schema.js';

@Controller('whoami')
class WhoAmIController {
  @Get()
  public ip(@Req() req: Request): { ip: string | undefined } {
    return { ip: req.ip };
  }
}

const clientIp = async (trustProxyHops: number): Promise<string | undefined> => {
  const moduleRef = await Test.createTestingModule({ controllers: [WhoAmIController] }).compile();
  const app = moduleRef.createNestApplication();
  AppSetup.configure(app, {
    CORS_ORIGINS: [],
    TRUST_PROXY_HOPS: trustProxyHops,
  } as unknown as GatewayEnv);
  await app.init();
  try {
    const response = await request(app.getHttpServer() as Server)
      .get('/api/v1/whoami')
      .set('X-Forwarded-For', '203.0.113.7');
    return (response.body as { ip?: string }).ip;
  } finally {
    await app.close();
  }
};

describe('AppSetup trust proxy', () => {
  it('keys requests on the forwarded client IP behind a trusted proxy (web rewrite, ingress)', async () => {
    expect(await clientIp(1)).toBe('203.0.113.7');
  });

  it('ignores X-Forwarded-For by default, so a direct client cannot spoof its IP', async () => {
    expect(await clientIp(0)).not.toBe('203.0.113.7');
  });
});
