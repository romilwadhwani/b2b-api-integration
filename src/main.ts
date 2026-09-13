import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('B2B API Integration Service')
    .setDescription(
      'B2B API service demonstrating async job queuing, ' +
        'API key auth, rate limiting, and Slack integration',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKey')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: 'api-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
