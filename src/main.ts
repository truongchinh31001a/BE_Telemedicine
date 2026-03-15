import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './bootstrap/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  const frontendOriginSuffixes = process.env.FRONTEND_ORIGIN_SUFFIXES ?? '';
  const port = Number(process.env.PORT ?? 8000);
  const allowedOrigins = frontendOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOriginSuffixes = frontendOriginSuffixes
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.toLowerCase();
      const isAllowedExact = allowedOrigins.includes(origin);
      const isAllowedBySuffix = allowedOriginSuffixes.some((suffix) => {
        try {
          return new URL(origin).hostname.toLowerCase().endsWith(suffix);
        } catch {
          return normalizedOrigin.endsWith(suffix);
        }
      });

      if (isAllowedExact || isAllowedBySuffix) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });
  setupSwagger(app);
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}
bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
