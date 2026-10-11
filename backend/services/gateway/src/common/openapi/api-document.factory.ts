import { OpenApiDefinitionsUtil } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** One definition of the public API document, served at /api/docs and exported to a file. */
export class ApiDocumentFactory {
  public static create(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
      .setTitle('Bazaar API')
      .setDescription('Gateway of the Bazaar marketplace. Errors use one problem-details shape.')
      .setVersion('1')
      .addBearerAuth()
      .addCookieAuth('bazaar_refresh')
      .build();
    return OpenApiDefinitionsUtil.hoist(SwaggerModule.createDocument(app, config));
  }
}
