import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Support chat')
  .addBearerAuth(
    {
      description: 'Default JWT Authorization',
      type: 'http',
      in: 'header',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'authorization',
  )
  .build();
