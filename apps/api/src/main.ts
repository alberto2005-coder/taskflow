import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Prefijo global: toda la API vive bajo /api (Swagger en /api/docs)
  app.setGlobalPrefix('api');

  // Seguridad de cabeceras y compresión de respuestas
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(compression());

  // CORS: solo el origen del frontend configurado
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: corsOrigin.split(','), credentials: true });

  // Validación estricta de DTOs: se eliminan las propiedades no declaradas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Documentación interactiva OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription(
      'API del gestor de tareas colaborativo TaskFlow. Autenticación JWT (access + refresh), ' +
        'roles ADMIN / MANAGER / MEMBER y recursos de proyectos, tareas y comentarios.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'TaskFlow · Documentación',
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  console.log(`✔ API escuchando en http://localhost:${port}/api`);

  console.log(`✔ Swagger en http://localhost:${port}/api/docs`);
}

void bootstrap();
