import { Module } from '@nestjs/common';
import { JWT_CONSTANTS } from './utils/const';
import {
  OTPVerification,
  OTPVerificationSchema,
} from './schemas/otp-verification-schema';
import { PasswordRepository } from './repositories/password-repository';
import { OTPRepository } from './repositories/otp-repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './schemas/account-schema';
import { Password, PasswordSchema } from './schemas/passwords-schema';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AccountRepository } from './repositories/account-repository';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Account.name,
        schema: AccountSchema,
      },
      {
        name: Password.name,
        schema: PasswordSchema,
      },
      {
        name: OTPVerification.name,
        schema: OTPVerificationSchema,
      },
    ]),
    PassportModule,
    JwtModule.register({
      secret: JWT_CONSTANTS.secret,
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forRoot(
      'mongodb://scannerUser:scannerUser123@localhost:27017/invoiceScannerAndAnalyticsDB',
      { useNewUrlParser: true },
    ),
  ],
  providers: [
    AuthService,
    AccountRepository,
    LocalStrategy,
    JwtStrategy,
    PasswordRepository,
    OTPRepository,
    ConfigService,
    {
      provide: 'MAIL_SENDER_SERVICE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: '0.0.0.0',
            port: 3002,
          },
        });
      },
    },
  ],
  controllers: [AuthController],
})
export class AppModule {}
