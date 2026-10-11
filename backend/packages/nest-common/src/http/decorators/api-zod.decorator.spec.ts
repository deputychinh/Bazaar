import { Body, Controller, Post } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { z } from 'zod';

import { ApiZodBody, ApiZodResponse } from './api-zod.decorator.js';

const createLampSchema = z.object({ name: z.string().min(3), watts: z.number().int().default(40) });
const lampSchema = z.object({ id: z.string(), name: z.string() });

@Controller('lamps')
class LampsController {
  @Post()
  @ApiZodBody(createLampSchema)
  @ApiZodResponse(201, lampSchema, 'Created lamp')
  public create(@Body() body: unknown): unknown {
    return body;
  }
}

describe('ApiZodBody / ApiZodResponse', () => {
  it('put the zod schemas into the OpenAPI document', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [LampsController] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const operation = document.paths['/lamps']?.post;

    expect(operation?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { name: { type: 'string', minLength: 3 }, watts: { type: 'integer' } },
            required: ['name'],
          },
        },
      },
    });
    expect(operation?.responses['201']).toMatchObject({
      description: 'Created lamp',
      content: { 'application/json': { schema: { required: ['id', 'name'] } } },
    });
    await app.close();
  });

  it('rejects a recursive schema without an id, since its definition name would collide', () => {
    const tree: z.ZodType = z.lazy(() => z.object({ children: z.array(tree) }));

    expect(() => ApiZodResponse(200, tree)).toThrow(/meta\(\{ id/);
  });
});
