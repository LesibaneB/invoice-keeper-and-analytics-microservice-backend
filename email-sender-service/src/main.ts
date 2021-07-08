import { NestFactory } from '@nestjs/core';
import { TcpOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      port: 3002,
    },
  } as TcpOptions);
  await app.listenAsync();
}
bootstrap();
