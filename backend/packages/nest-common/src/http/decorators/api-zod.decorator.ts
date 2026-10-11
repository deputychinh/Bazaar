import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

// @nestjs/swagger does not export its SchemaObject type; derive it from ApiBody's options.
type SchemaObject = NonNullable<
  Extract<Parameters<typeof ApiBody>[0], { schema?: unknown }>['schema']
>;

// Unnamed recursion: `#` points at the OpenAPI document root, `__schemaN` collides across routes.
const ANONYMOUS_REF = /"\$ref":"#(\/definitions\/__schema\d+)?"/;

const toJsonSchema = (schema: z.ZodType, io: 'input' | 'output'): z.core.JSONSchema.BaseSchema => {
  const jsonSchema = z.toJSONSchema(schema, { target: 'openapi-3.0', io });
  if (ANONYMOUS_REF.test(JSON.stringify(jsonSchema))) {
    throw new Error('Recursive zod schemas used in OpenAPI need .meta({ id: "<SchemaName>" })');
  }
  return jsonSchema;
};

const toOpenApiSchema = (schema: z.ZodType, io: 'input' | 'output'): SchemaObject =>
  toJsonSchema(schema, io) as SchemaObject;

/** Documents a request body from the same zod schema that validates it. */
export const ApiZodBody = (schema: z.ZodType): MethodDecorator & ClassDecorator =>
  applyDecorators(ApiBody({ schema: toOpenApiSchema(schema, 'input') }));

/**
 * Documents every field of a zod object schema as a query parameter. A field that references a
 * named schema keeps its `definitions` so `OpenApiDefinitionsUtil.hoist` can move them.
 */
export const ApiZodQuery = (schema: z.ZodType): MethodDecorator & ClassDecorator => {
  const { properties = {}, required = [], definitions } = toJsonSchema(schema, 'input');
  return applyDecorators(
    ...Object.entries(properties).map(([name, property]) =>
      ApiQuery({
        name,
        required: required.includes(name),
        schema: (JSON.stringify(property).includes('#/definitions/')
          ? { ...(property as object), definitions }
          : property) as SchemaObject,
      }),
    ),
  );
};

/** Documents a response body from a zod schema. */
export const ApiZodResponse = (
  status: number,
  schema: z.ZodType,
  description?: string,
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiResponse({
      status,
      description,
      schema: toOpenApiSchema(schema, 'output'),
    }),
  );
