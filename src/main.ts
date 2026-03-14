import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './bootstrap/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  const port = Number(process.env.PORT ?? 8000);
  app.enableCors({
    origin: frontendOrigin.split(',').map((item) => item.trim()),
    credentials: true,
  });
  setupSwagger(app);
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}
bootstrap();
