import { OpenApiDefinitionsUtil, OpenApiProblemDetailsUtil } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Public order API, reached through the gateway at the same /api/v1 paths. */
export class ApiDocumentFactory {
  public static create(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
      .setTitle('Bazaar Order API')
      .setDescription(
        'Checkout, orders and seller fulfilment. Served through the gateway; errors use problem details.',
      )
      .setVersion('1')
      .addBearerAuth()
      .build();
    return OpenApiDefinitionsUtil.hoist(
      OpenApiProblemDetailsUtil.attach(SwaggerModule.createDocument(app, config)),
    );
  }
}
