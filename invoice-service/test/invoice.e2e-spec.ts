import { InvoiceDTO } from './../src/dto/invoice-upload.dto';
import { Transport, ClientProxy } from '@nestjs/microservices';
import { VerifyAccountDTO } from './../../auth-service/src/dto/verify-otp.dto';
import { JwtTokenDto } from './../../auth-service/src/dto/jwt-token.dto';
import { CreateAccountDto } from './../../auth-service/src/dto/create-account.dto';
import { INVOICE_TEXT_EMPTY } from './../src/utils/messages';
import { ExtractEntitiesDto } from './../src/dto/extract-entities.dto';
import { InvoiceService } from './../src/services/invoice/invoice.service';
import { InvoiceModel } from './../src/models/invoice';
import { OTPRepository } from './../../auth-service/src/repositories/otp-repository';
import { AccountRepository } from './../../auth-service/src/repositories/account-repository';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import {
  closeInMemoryMongoConnection,
  rootMongooseTestModule,
} from '../src/utils/mongo-inmemory-db-handler';
import * as faker from 'faker';
import { AppModule } from '../src/app.module';
import { AppModule as AuthModule } from '../../auth-service/src/app.module';
import { AppModule as EmailModule } from '../../email-sender-service/src/app.module';

describe('Invoice E2E', () => {
  let app: INestApplication;
  let accountRepo: AccountRepository;
  let otpRepo: OTPRepository;

  const extractionResult: InvoiceModel = {
    storeName: 'Arthurs',
    storeAddress: '237 Washington Hoboken, NJ 07030',
    date: 'Oct-01-17',
    time: '01:44PM',
    total: 84.78,
    tax: 3.98,
    invoiceImageURL:
      'https://storage.cloud.google.com/processed-invoice-image-data/1001-receipt.jpg',
    items: [
      {
        name: 'Arthurs Burger ChsBleu',
        price: 12,
        quantity: 1,
      },
      {
        name: 'Quesadilla',
        price: 8.95,
        quantity: 1,
      },
      {
        name: 'Pint Yeungling',
        price: 28.99,
        quantity: 2,
      },
    ],
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [rootMongooseTestModule(), AppModule, AuthModule, EmailModule],
    }).compile();

    accountRepo = moduleFixture.get<AccountRepository>(AccountRepository);
    otpRepo = moduleFixture.get<OTPRepository>(OTPRepository);

    jest
      .spyOn(InvoiceService.prototype, 'extractEntities')
      .mockImplementation(async () => extractionResult);

    app = moduleFixture.createNestApplication();
    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        port: 3002,
      },
    });
    app.useGlobalPipes(new ValidationPipe());

    app.startAllMicroservices();
    await app.listen(3003);
  });

  afterEach(async () => {
    await closeInMemoryMongoConnection();
    await app.close();
  });

  it('/invoice/extract-data (POST) should successfully extract entities and return results when called with correct payload', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText:
        "Arthurs 237 Washington Hoboken, NJ 07030 (201) 656-5009 1058 Alexandr Chk 1844 Gst 3 TAB/62 Oct01'17 01:44PM Bar 1 Arthur's Burger ChsBleu 13.95 1 Our Burger **Avocado 15.95 1 Loaded Nachos 12.95 1 Pint Boston Lager 6.00 2 Pint Yeungling 12.00 1 Kona Longboard 6.00 1 Quesadilla 13.95 food liquor Tax 02:28PM Total Due 56.80 24.00 3.98 84.78 20% added to parties 8 or more Thank You for Dining with Us! Private Rooms Available for Your Next Party!",
    };

    return request(app.getHttpServer())
      .post('/invoice/extract-data')
      .send(extractionPayload)
      .expect(201, extractionResult);
  });

  it('/invoice/extract-data (POST) should fail to extract entities when called with empty invoiceText in payload', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText: '',
    };

    return request(app.getHttpServer())
      .post('/invoice/extract-data')
      .send(extractionPayload)
      .expect(400, {
        statusCode: 400,
        message: [INVOICE_TEXT_EMPTY],
        error: 'Bad Request',
      });
  });

  it('/invoice/upload (POST) should fail to upload and store invoice data when the user is not signed-in and is called with the correct payload.', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText:
        "Arthurs 237 Washington Hoboken, NJ 07030 (201) 656-5009 1058 Alexandr Chk 1844 Gst 3 TAB/62 Oct01'17 01:44PM Bar 1 Arthur's Burger ChsBleu 13.95 1 Our Burger **Avocado 15.95 1 Loaded Nachos 12.95 1 Pint Boston Lager 6.00 2 Pint Yeungling 12.00 1 Kona Longboard 6.00 1 Quesadilla 13.95 food liquor Tax 02:28PM Total Due 56.80 24.00 3.98 84.78 20% added to parties 8 or more Thank You for Dining with Us! Private Rooms Available for Your Next Party!",
    };

    return request(app.getHttpServer())
      .post('/invoice/extract-data')
      .send(extractionPayload)
      .expect(201, extractionResult)
      .then((result) => {
        const invoice = JSON.parse(result?.text);
        return request(app.getHttpServer())
          .post('/invoice/upload')
          .set(
            'Authorization',
            `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiI2MDc2MGU2MGMxMDEyMDMzN2NiOTRiZDAiLCJmaXJzdE5hbWUiOiJCb25ha2VsZSIsImxhc3ROYW1lIjoiTGVzaWJhbmUiLCJlbWFpbEFkZHJlc3MiOiJib25ha2VsZS5sZXNpYmFuZUBnbWFpbC5jb20iLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNjE5MjIxNzIyLCJleHAiOjE2MTkyMjUzMjJ9.LdGLRtjCk1gF972eNo_xui3Si0wVWGZ5bkWWcDuEWT9`,
          )
          .send(invoice)
          .expect(401);
      });
  });

  it('/invoice/upload (POST) should successfully upload and store invoice data when the user is signed-in and is called with the correct payload.', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText:
        "Arthurs 237 Washington Hoboken, NJ 07030 (201) 656-5009 1058 Alexandr Chk 1844 Gst 3 TAB/62 Oct01'17 01:44PM Bar 1 Arthur's Burger ChsBleu 13.95 1 Our Burger **Avocado 15.95 1 Loaded Nachos 12.95 1 Pint Boston Lager 6.00 2 Pint Yeungling 12.00 1 Kona Longboard 6.00 1 Quesadilla 13.95 food liquor Tax 02:28PM Total Due 56.80 24.00 3.98 84.78 20% added to parties 8 or more Thank You for Dining with Us! Private Rooms Available for Your Next Party!",
    };

    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };
    let jwt: JwtTokenDto;

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
              .expect(201)
              .then((signInResult) => {
                jwt = JSON.parse(signInResult?.text);
                return request(app.getHttpServer())
                  .post('/invoice/extract-data')
                  .send(extractionPayload)
                  .expect(201, extractionResult)
                  .then((invoiceExtractionResult) => {
                    const invoice: InvoiceDTO = JSON.parse(
                      invoiceExtractionResult?.text,
                    );
                    return request(app.getHttpServer())
                      .post('/invoice/upload')
                      .set('Authorization', `Bearer ${jwt.access_token}`)
                      .send(invoice)
                      .expect(201);
                  });
              });
          });
      });
  });

  it('/invoice (GET) should fail to retrieve all invoices for the user when the user not signed-in.', () => {
    return request(app.getHttpServer())
      .get('/invoice')
      .set(
        'Authorization',
        `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiI2MDc2MGU2MGMxMDEyMDMzN2NiOTRiZDAiLCJmaXJzdE5hbWUiOiJCb25ha2VsZSIsImxhc3ROYW1lIjoiTGVzaWJhbmUiLCJlbWFpbEFkZHJlc3MiOiJib25ha2VsZS5sZXNpYmFuZUBnbWFpbC5jb20iLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNjE5MjIxNzIyLCJleHAiOjE2MTkyMjUzMjJ9.LdGLRtjCk1gF972eNo_xui3Si0wVWGZ5bkWWcDuEWT9`,
      )
      .expect(401);
  });

  it('/invoice (GET) should successfully retrieve all invoices for the user when the user is signed-in.', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText:
        "Arthurs 237 Washington Hoboken, NJ 07030 (201) 656-5009 1058 Alexandr Chk 1844 Gst 3 TAB/62 Oct01'17 01:44PM Bar 1 Arthur's Burger ChsBleu 13.95 1 Our Burger **Avocado 15.95 1 Loaded Nachos 12.95 1 Pint Boston Lager 6.00 2 Pint Yeungling 12.00 1 Kona Longboard 6.00 1 Quesadilla 13.95 food liquor Tax 02:28PM Total Due 56.80 24.00 3.98 84.78 20% added to parties 8 or more Thank You for Dining with Us! Private Rooms Available for Your Next Party!",
    };

    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };
    let jwt: JwtTokenDto;

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
              .expect(201)
              .then((signInResult) => {
                jwt = JSON.parse(signInResult?.text);
                return request(app.getHttpServer())
                  .post('/invoice/extract-data')
                  .send(extractionPayload)
                  .expect(201, extractionResult)
                  .then((invoiceExtractionResult) => {
                    const invoice = JSON.parse(invoiceExtractionResult?.text);
                    return request(app.getHttpServer())
                      .post('/invoice/upload')
                      .set('Authorization', `Bearer ${jwt.access_token}`)
                      .send(invoice)
                      .expect(201)
                      .then(() => {
                        return request(app.getHttpServer())
                          .get('/invoice')
                          .set('Authorization', `Bearer ${jwt.access_token}`)
                          .send(invoice)
                          .expect(200)
                          .then((fetchAllInvoiceResult) => {
                            const invoices = JSON.parse(
                              fetchAllInvoiceResult?.text,
                            );
                            expect(invoices.length).toBe(1);
                          });
                      });
                  });
              });
          });
      });
  });

  it('/invoice?invoiceId (GET) should fail to retrieve an invoice for the user when the user not signed-in.', () => {
    return request(app.getHttpServer())
      .get('/invoice')
      .query({ invoiceId: 1 })
      .set(
        'Authorization',
        `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiI2MDc2MGU2MGMxMDEyMDMzN2NiOTRiZDAiLCJmaXJzdE5hbWUiOiJCb25ha2VsZSIsImxhc3ROYW1lIjoiTGVzaWJhbmUiLCJlbWFpbEFkZHJlc3MiOiJib25ha2VsZS5sZXNpYmFuZUBnbWFpbC5jb20iLCJ2ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNjE5MjIxNzIyLCJleHAiOjE2MTkyMjUzMjJ9.LdGLRtjCk1gF972eNo_xui3Si0wVWGZ5bkWWcDuEWT9`,
      )
      .expect(401);
  });

  it('/invoice?invoiceId (GET) should successfully retrieve an invoice for the user when the user is signed-in.', () => {
    const extractionPayload: ExtractEntitiesDto = {
      invoiceText:
        "Arthurs 237 Washington Hoboken, NJ 07030 (201) 656-5009 1058 Alexandr Chk 1844 Gst 3 TAB/62 Oct01'17 01:44PM Bar 1 Arthur's Burger ChsBleu 13.95 1 Our Burger **Avocado 15.95 1 Loaded Nachos 12.95 1 Pint Boston Lager 6.00 2 Pint Yeungling 12.00 1 Kona Longboard 6.00 1 Quesadilla 13.95 food liquor Tax 02:28PM Total Due 56.80 24.00 3.98 84.78 20% added to parties 8 or more Thank You for Dining with Us! Private Rooms Available for Your Next Party!",
    };

    const password = faker.internet.password();
    const emailAddress = faker.internet.email();
    const createAccountParams: CreateAccountDto = {
      firstName: faker.name.findName(),
      lastName: faker.name.lastName(),
      emailAddress,
      password,
      confirmPassword: password,
    };
    let jwt: JwtTokenDto;

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
              .expect(201)
              .then((signInResult) => {
                jwt = JSON.parse(signInResult?.text);
                return request(app.getHttpServer())
                  .post('/invoice/extract-data')
                  .send(extractionPayload)
                  .expect(201, extractionResult)
                  .then((invoiceExtractionResult) => {
                    const invoice = JSON.parse(invoiceExtractionResult?.text);
                    return request(app.getHttpServer())
                      .post('/invoice/upload')
                      .set('Authorization', `Bearer ${jwt.access_token}`)
                      .send(invoice)
                      .expect(201)
                      .then(() => {
                        return request(app.getHttpServer())
                          .get('/invoice')
                          .set('Authorization', `Bearer ${jwt.access_token}`)
                          .expect(200)
                          .then((fetchAllInvoiceResult) => {
                            const invoices = JSON.parse(
                              fetchAllInvoiceResult?.text,
                            );
                            expect(invoices.length).toBe(1);

                            return request(app.getHttpServer())
                              .get('/invoice')
                              .query({ invoiceId: invoices[0]._id })
                              .set(
                                'Authorization',
                                `Bearer ${jwt.access_token}`,
                              )
                              .expect(200);
                          });
                      });
                  });
              });
          });
      });
  });
});
