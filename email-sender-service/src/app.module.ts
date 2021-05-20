import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getSendGridConfig } from './config/sendgrid-configuration';
import { EmailSenderService } from './email-sender.service';

@Module({
  imports: [
    ConfigModule,
    ConfigModule.forRoot({
      load: [getSendGridConfig],
    }),
  ],
  providers: [EmailSenderService],
})
export class AppModule {}
