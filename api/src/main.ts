import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

import * as helmet from "helmet";
import * as rateLimit from "express-rate-limit";

import { AppModule } from "./app.module";
import { serverPort } from "./app.constants";

const minimumJwtSecretBytes = 32;

function assertJwtSecret(): void {
  const secret = process.env.JWT_SECRET;
  const bytes = typeof secret === "string" ? Buffer.byteLength(secret, "utf8") : 0;
  if (bytes < minimumJwtSecretBytes) {
    Logger.error("JWT_SECRET must be at least 32 UTF-8 bytes", undefined, "Bootstrap");
    process.exit(1);
  }
}

async function bootstrap() {
  assertJwtSecret();
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(rateLimit(
    {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 15 * 60 / 5 // limit each IP to 150 requests per windowMs
    }
  ));

  app.enableCors();

  const options = new DocumentBuilder()
  .setTitle("Ideas API")
  .setDescription("A NestJS API")
  .setVersion("1.0")
  .addBearerAuth()
  .addServer("/api")
  .build();

  const document = SwaggerModule.createDocument(app, options);

  // NestJS Swagger 2 redirected the bare docs path. Swagger 12 serves it.
  app.use((req, res, next) => {
    if (req.path === "/docs") {
      res.redirect(301, "/docs/");
      return;
    }
    next();
  });

  SwaggerModule.setup("docs", app, document);

  await app.listen(serverPort);

  Logger.log(`Server running on port ${serverPort}`, "Bootstrap");

}

bootstrap();
