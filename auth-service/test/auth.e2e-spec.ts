import { AppModule } from '../src/app.module';
import { AppModule as EmailAppModule } from '../../email-sender-service/src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as faker from 'faker';

import {
  closeInMemoryMongoConnection,
  rootMongooseTestModule,
} from '../src/utils/mongo-inmemory-db-handler';
import { AccountRepository } from '../src/repositories/account-repository';
import { OTPRepository } from '../src/repositories/otp-repository';
import { CreateAccountDto } from '../src/dto/create-account.dto';
import {
  ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
  AUTH_ACCOUNT_ERROR_MESSAGES,
  EMAIL_ADDRESS_INVALID,
  LOGIN_UNAUTHORIZED_MESSAGE,
} from '../src/utils/messages';
import { VerifyAccountDTO } from '../src/dto/verify-otp.dto';
import { SendAccountVerificationDTO } from '../src/dto/resend-otp.dto';
import { ResetPasswordDTO } from '../src/dto/reset-password.dto';
import { Transport } from '@nestjs/microservices';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accountRepo: AccountRepository;
  let otpRepo: OTPRepository;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [rootMongooseTestModule(), AppModule, EmailAppModule],
    }).compile();

    accountRepo = moduleFixture.get<AccountRepository>(AccountRepository);
    otpRepo = moduleFixture.get<OTPRepository>(OTPRepository);

    app = moduleFixture.createNestApplication();
    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        port: 3002,
      },
    });
    app.useGlobalPipes(new ValidationPipe());

    await app.startAllMicroservicesAsync();
    await app.listenAsync(3001);
  });

  afterEach(async () => {
    await closeInMemoryMongoConnection();
    await app.close();
  });

  it('/auth/account (POST) should successfully create an account when called with correct payload', () => {
    const password = faker.internet.password();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress: faker.internet.email(),
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201);
  });

  it('/auth/account (POST) should fail with appropriate messages to create an account when called with empty password and confirmPassword fields in the payload', () => {
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress: faker.internet.email(),
      password: '',
      confirmPassword: '',
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(400, {
        statusCode: 400,
        message: [
          AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
          AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
        ],
        error: 'Bad Request',
      });
  });

  it('/auth/account (POST) should fail with appropriate messages to create an account when called with empty firstName and lastName fields in the payload', () => {
    const password = faker.internet.password();
    const createAccountParams: CreateAccountDto = {
      firstName: '',
      lastName: '',
      emailAddress: faker.internet.email(),
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(400, {
        statusCode: 400,
        message: [
          AUTH_ACCOUNT_ERROR_MESSAGES.firstNameEmpty,
          AUTH_ACCOUNT_ERROR_MESSAGES.lastNameEmpty,
        ],
        error: 'Bad Request',
      });
  });

  it('/auth/account (POST) should fail with appropriate message to create an account when called with badly formatted email.', () => {
    const password = faker.internet.password();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress: faker.name.middleName(),
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(400, {
        statusCode: 400,
        message: [EMAIL_ADDRESS_INVALID],
        error: 'Bad Request',
      });
  });

  it('/auth/sign-in (POST) should successfully sign-in when trying to sign in a user that has been verified using the correct email address and password.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(async () => {
        const account = await accountRepo.findByEmailAddress(emailAddress);
        expect(account).toBeDefined();

        const otp = await otpRepo.find(account._id);
        expect(otp).toBeDefined();

        const accountVerificationPayload: VerifyAccountDTO = {
          emailAddress: account.emailAddress,
          otp: otp.otp,
        };

        return request(app.getHttpServer())
          .post('/auth/account/verify')
          .send(accountVerificationPayload)
          .expect(201)
          .then(() => {
            const signInPayload = {
              emailAddress: accountVerificationPayload.emailAddress,
              password,
            };

            return request(app.getHttpServer())
              .post('/auth/sign-in')
              .send(signInPayload)
              .expect(201);
          });
      });
  });

  it('/auth/sign-in (POST) should fail with appropriate message when trying to sign in a user with the incorrect email address.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(() => {
        const signInPayload = {
          emailAddress: faker.internet.email(),
          password,
        };

        return request(app.getHttpServer())
          .post('/auth/sign-in')
          .send(signInPayload)
          .expect(401, {
            statusCode: 401,
            message: LOGIN_UNAUTHORIZED_MESSAGE,
            error: 'Unauthorized',
          });
      });
  });

  it('/auth/sign-in (POST) should fail with appropriate message when trying to sign in a user with the incorrect password.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(() => {
        const signInPayload = {
          emailAddress,
          password: faker.internet.password(),
        };

        return request(app.getHttpServer())
          .post('/auth/sign-in')
          .send(signInPayload)
          .expect(401, {
            statusCode: 401,
            message: LOGIN_UNAUTHORIZED_MESSAGE,
            error: 'Unauthorized',
          });
      });
  });

  it('/auth/account/send-verification (POST) should succesfully send verification for an account when trying to send verification with a correct email address.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(async () => {
        const sendVerificationPayload: SendAccountVerificationDTO = {
          emailAddress,
        };
        return request(app.getHttpServer())
          .post('/auth/account/send-verification')
          .send(sendVerificationPayload)
          .expect(201);
      });
  });

  it('/auth/account/send-verification (POST) should fail to send verification for an account when trying to send verification with an incorrect email address.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(async () => {
        const sendVerificationPayload: SendAccountVerificationDTO = {
          emailAddress: faker.internet.email(),
        };

        return request(app.getHttpServer())
          .post('/auth/account/send-verification')
          .send(sendVerificationPayload)
          .expect(400, {
            statusCode: 400,
            message: ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
            error: 'Bad Request',
          });
      });
  });

  it('/auth/account/reset-password (PUT) should succesfully reset password for an account when trying to reset password with a correct payload.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(async () => {
        const newPassword = faker.internet.password();
        const resetPassword: ResetPasswordDTO = {
          emailAddress: createAccountParams.emailAddress,
          password: newPassword,
          confirmPassword: newPassword,
        };

        return request(app.getHttpServer())
          .put('/auth/account/reset-password')
          .send(resetPassword)
          .expect(200);
      });
  });

  it('/auth/account/reset-password (PUT) should fail to reset password for an account when trying to reset password with an incorrect payload.', async () => {
    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };

    return request(app.getHttpServer())
      .post('/auth/account')
      .send(createAccountParams)
      .expect(201)
      .then(async () => {
        const newPassword = faker.internet.password();
        const resetPassword: ResetPasswordDTO = {
          emailAddress: faker.internet.email(),
          password: newPassword,
          confirmPassword: newPassword,
        };

        return request(app.getHttpServer())
          .put('/auth/account/reset-password')
          .send(resetPassword)
          .expect(400, {
            statusCode: 400,
            message: ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
            error: 'Bad Request',
          });
      });
  });
});
