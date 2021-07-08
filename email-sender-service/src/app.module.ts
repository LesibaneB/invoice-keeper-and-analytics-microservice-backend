import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getSendGridConfig } from './config/sendgrid-configuration';
import { EmailSenderService } from './email-sender.service';
import { EmailSenderController } from './email-sender.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule,
    ConfigModule.forRoot({
      load: [getSendGridConfig],
    }),
    ClientsModule.register([
      {
        name: 'MAIL_SENDER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 3002,
        },
      },
    ]),
  ],
  providers: [EmailSenderService],
  controllers: [EmailSenderController],
})
export class AppModule {}
