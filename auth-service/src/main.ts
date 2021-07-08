import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TcpOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.TCP,
  } as TcpOptions);
  await app.startAllMicroservicesAsync();
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3001);
}
bootstrap();
