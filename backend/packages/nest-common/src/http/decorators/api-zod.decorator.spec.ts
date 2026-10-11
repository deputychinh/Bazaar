import { Body, Controller, Get, Post } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { z } from 'zod';

import { OpenApiDefinitionsUtil } from '../openapi-definitions.util.js';

import { ApiZodBody, ApiZodQuery, ApiZodResponse } from './api-zod.decorator.js';

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

  it('documents each query field as a parameter, with named enums hoisted to components', async () => {
    const Sort = { Newest: 'newest', Price: 'price' } as const;
    const sortSchema = z.enum(Sort).meta({ id: 'LampSort' });
    const querySchema = z.object({
      sort: sortSchema.optional(),
      page: z.coerce.number().int().min(1).default(1),
      q: z.string().min(1),
    });

    @Controller('lamps')
    class LampSearchController {
      @Get()
      @ApiZodQuery(querySchema)
      public list(): unknown {
        return [];
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [LampSearchController],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const document = OpenApiDefinitionsUtil.hoist(
      SwaggerModule.createDocument(app, new DocumentBuilder().build()),
    );

    const parameters = document.paths['/lamps']?.get?.parameters ?? [];
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'sort',
          in: 'query',
          required: false,
          schema: { allOf: [{ $ref: '#/components/schemas/LampSort' }] },
        }),
        expect.objectContaining({
          name: 'page',
          in: 'query',
          required: false,
          schema: expect.objectContaining({ type: 'integer', default: 1 }),
        }),
        expect.objectContaining({ name: 'q', in: 'query', required: true }),
      ]),
    );
    expect(document.components?.schemas?.['LampSort']).toEqual({
      type: 'string',
      enum: ['newest', 'price'],
    });
    await app.close();
  });

  it('rejects a recursive schema without an id, since its definition name would collide', () => {
    const tree: z.ZodType = z.lazy(() => z.object({ children: z.array(tree) }));

    expect(() => ApiZodResponse(200, tree)).toThrow(/meta\(\{ id/);
  });
});
