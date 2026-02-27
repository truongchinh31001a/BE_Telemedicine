import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './bootstrap/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: frontendOrigin.split(',').map((item) => item.trim()),
    credentials: true,
  });
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
