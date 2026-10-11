import { ErrorCode } from '@bazaar/contracts';
import type { OpenAPIObject } from '@nestjs/swagger';

import { OpenApiDefinitionsUtil } from './openapi-definitions.util.js';
import { OpenApiProblemDetailsUtil } from './openapi-problem-details.util.js';

const document = {
  openapi: '3.0.0',
  info: { title: 'test', version: '1' },
  paths: {
    '/things': {
      get: { responses: { '200': { description: 'ok' } } },
      parameters: [],
    },
  },
  components: { schemas: {} },
} as unknown as OpenAPIObject;

describe('OpenApiProblemDetailsUtil', () => {
  it('adds ProblemDetails with the ErrorCode enum and a default error response everywhere', () => {
    const result = OpenApiDefinitionsUtil.hoist(OpenApiProblemDetailsUtil.attach(document));

    expect(result.paths['/things']?.get?.responses).toMatchObject({
      '200': { description: 'ok' },
      default: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
        },
      },
    });
    expect(result.components?.schemas?.ErrorCode).toEqual({
      type: 'string',
      enum: Object.values(ErrorCode),
    });
    expect(result.components?.schemas?.ProblemDetails).toMatchObject({
      required: ['code', 'message', 'status'],
      properties: { code: { $ref: '#/components/schemas/ErrorCode' } },
    });
    expect(JSON.stringify(result)).not.toContain('#/definitions/');
  });
});
