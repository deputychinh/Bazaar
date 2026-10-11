import type { OpenAPIObject } from '@nestjs/swagger';

import { OpenApiDefinitionsUtil } from './openapi-definitions.util.js';

const node = {
  type: 'object',
  properties: { children: { type: 'array', items: { $ref: '#/definitions/Node' } } },
};

const documentWith = (
  schema: unknown,
  components: OpenAPIObject['components'] = {},
): OpenAPIObject =>
  ({
    openapi: '3.0.0',
    info: { title: 't', version: '1' },
    paths: {
      '/nodes': {
        get: {
          responses: { '200': { description: 'ok', content: { 'application/json': { schema } } } },
        },
      },
    },
    components,
  }) as OpenAPIObject;

const responseSchema = (document: OpenAPIObject): unknown =>
  (
    document.paths['/nodes']?.get?.responses['200'] as {
      content: Record<string, { schema: unknown }>;
    }
  ).content['application/json']?.schema;

describe('OpenApiDefinitionsUtil.hoist', () => {
  it('moves nested definitions into components.schemas and rewrites their refs', () => {
    const document = documentWith({
      type: 'array',
      items: { $ref: '#/definitions/Node' },
      definitions: { Node: node },
    });

    const result = OpenApiDefinitionsUtil.hoist(document);

    expect(responseSchema(result)).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/Node' },
    });
    expect(result.components?.schemas?.['Node']).toEqual({
      type: 'object',
      properties: { children: { type: 'array', items: { $ref: '#/components/schemas/Node' } } },
    });
  });

  it('keeps a property that happens to be named definitions', () => {
    const schema = { type: 'object', properties: { definitions: { type: 'string' } } };

    expect(responseSchema(OpenApiDefinitionsUtil.hoist(documentWith(schema)))).toEqual(schema);
  });

  it('does not mutate the input document', () => {
    const document = documentWith({ $ref: '#/definitions/Node', definitions: { Node: node } });
    const snapshot = structuredClone(document);

    OpenApiDefinitionsUtil.hoist(document);

    expect(document).toEqual(snapshot);
  });

  it('rejects two different schemas under one name', () => {
    const document = documentWith(
      { $ref: '#/definitions/Node', definitions: { Node: node } },
      { schemas: { Node: { type: 'string' } } },
    );

    expect(() => OpenApiDefinitionsUtil.hoist(document)).toThrow(/Node/);
  });
});
