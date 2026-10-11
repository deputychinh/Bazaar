import type { OpenAPIObject } from '@nestjs/swagger';

type ComponentSchema = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string];

const LOCAL_REF = '#/definitions/';
const COMPONENT_REF = '#/components/schemas/';

/**
 * `z.toJSONSchema` puts recursive schemas in a local `definitions` block, but OpenAPI resolves
 * `$ref` from the document root. Moves every such block into `components.schemas`.
 */
export class OpenApiDefinitionsUtil {
  public static hoist(document: OpenAPIObject): OpenAPIObject {
    const hoisted = new Map<string, ComponentSchema>(
      Object.entries(document.components?.schemas ?? {}),
    );
    const { components, ...rest } = document;
    const visited = OpenApiDefinitionsUtil.visit(rest, hoisted) as Omit<
      OpenAPIObject,
      'components'
    >;
    return { ...visited, components: { ...components, schemas: Object.fromEntries(hoisted) } };
  }

  private static visit(
    value: unknown,
    hoisted: Map<string, ComponentSchema>,
    parentKey?: string,
  ): unknown {
    if (Array.isArray(value))
      return value.map((item) => OpenApiDefinitionsUtil.visit(item, hoisted));
    if (!OpenApiDefinitionsUtil.isRecord(value)) return value;
    const { definitions, ...rest } = value;
    const keepsDefinitions =
      parentKey === 'properties' || !OpenApiDefinitionsUtil.isRecord(definitions);
    if (!keepsDefinitions) {
      Object.entries(definitions).forEach(([name, schema]) =>
        OpenApiDefinitionsUtil.register(
          hoisted,
          name,
          OpenApiDefinitionsUtil.visit(schema, hoisted) as ComponentSchema,
        ),
      );
    }
    const source = keepsDefinitions ? value : rest;
    return Object.fromEntries(
      Object.entries(source).map(([key, child]) => [
        key,
        key === '$ref' && typeof child === 'string' && child.startsWith(LOCAL_REF)
          ? `${COMPONENT_REF}${child.slice(LOCAL_REF.length)}`
          : OpenApiDefinitionsUtil.visit(child, hoisted, key),
      ]),
    );
  }

  private static register(
    hoisted: Map<string, ComponentSchema>,
    name: string,
    schema: ComponentSchema,
  ): void {
    const existing = hoisted.get(name);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(schema)) {
      throw new Error(`OpenAPI schema "${name}" is defined twice with different shapes`);
    }
    hoisted.set(name, schema);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
