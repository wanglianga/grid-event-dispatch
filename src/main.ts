import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 网格事件派单服务已启动: http://localhost:${port}`);
  console.log(`📖 API 文档前缀: /api`);
}
bootstrap();
