import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './common/config/env.config';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './common/config/swagger.config';
import { HttpExceptionFilter } from './common/filter/http.exception-filter';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Optionally enable CORS for HTTP endpoints
  app.enableCors({
    //origin: ['https://dev.davoai.uz', 'https://davoai.uz'],
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(env.PORT || 3000);

  // Log application details
  const baseUrl = await app.getUrl();
  console.log(`🚀 Application is running on: ${baseUrl}`);
  console.log(`📚 API Documentation available at: ${baseUrl}/swagger`);
}
bootstrap();
