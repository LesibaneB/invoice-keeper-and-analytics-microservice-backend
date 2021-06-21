import { EmailPayload } from './models/email-payload';
import { EmailSenderService } from './email-sender.service';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class EmailSenderController {
  constructor(private emailSenderService: EmailSenderService) {}

  @MessagePattern('send_mail')
  public async onSendMail(emailPayload: EmailPayload): Promise<void> {
    await this.emailSenderService.sendOTPVericationEmail(emailPayload);
  }
}
