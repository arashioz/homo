import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const prefix = process.env.API_PREFIX || "v1";
  const origins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8100")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix(prefix);
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("HOMO Business API")
      .setDescription("API for Smart Home Business CRM")
      .setVersion("1.0")
      .build(),
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(Number(process.env.PORT || 4000));
}

void bootstrap();
