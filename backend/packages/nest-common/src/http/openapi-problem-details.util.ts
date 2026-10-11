import { problemDetailsSchema } from '@bazaar/contracts';
import type { OpenAPIObject } from '@nestjs/swagger';
import { z } from 'zod';

type Operation = Record<string, unknown> & { responses?: Record<string, unknown> };

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'];
const PROBLEM_DETAILS_REF = '#/components/schemas/ProblemDetails';

/**
 * Documents the one error shape (plan §5.4): adds ProblemDetails and ErrorCode to the components and a
 * `default` response to every operation, so generated clients know every error code.
 * Run before OpenApiDefinitionsUtil.hoist, which moves the local definitions into components.
 */
export class OpenApiProblemDetailsUtil {
  public static attach(document: OpenAPIObject): OpenAPIObject {
    const errorResponse = {
      description: 'Error (problem details). Translate `code`; `message` is for developers.',
      content: { 'application/json': { schema: { $ref: PROBLEM_DETAILS_REF } } },
    };
    const paths = Object.fromEntries(
      Object.entries(document.paths).map(([path, item]) => [
        path,
        Object.fromEntries(
          Object.entries(item as Record<string, unknown>).map(([method, operation]) => [
            method,
            HTTP_METHODS.includes(method)
              ? OpenApiProblemDetailsUtil.withDefault(operation as Operation, errorResponse)
              : operation,
          ]),
        ),
      ]),
    ) as OpenAPIObject['paths'];
    // A schema with an id comes back as { $ref, definitions: { ProblemDetails, ErrorCode } }.
    const { definitions } = z.toJSONSchema(problemDetailsSchema, {
      target: 'openapi-3.0',
      io: 'output',
    }) as { definitions?: NonNullable<OpenAPIObject['components']>['schemas'] };
    return {
      ...document,
      paths,
      components: {
        ...document.components,
        schemas: {
          ...document.components?.schemas,
          ...OpenApiProblemDetailsUtil.withComponentRefs(definitions ?? {}),
        },
      },
    };
  }

  private static withDefault(operation: Operation, errorResponse: object): Operation {
    return { ...operation, responses: { default: errorResponse, ...operation.responses } };
  }

  private static withComponentRefs<T extends object>(schema: T): T {
    return JSON.parse(
      JSON.stringify(schema).replaceAll('"#/definitions/', '"#/components/schemas/'),
    ) as T;
  }
}
