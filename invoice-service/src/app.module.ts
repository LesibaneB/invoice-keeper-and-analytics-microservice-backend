import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './services/invoice/invoice.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice-schema';
import { InvoiceRepository } from './respositories/invoice-repository';
import { FileUploadService } from './services/file-upload/file-upload.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JWT_CONSTANTS } from './utils/const';
import { getGCloudConfig } from './config/gcloud-automl-configuration';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceRepository,
    FileUploadService,
    JwtStrategy,
  ],
  imports: [
    ConfigModule,
    ConfigModule.forRoot({
      load: [getGCloudConfig],
    }),
    MongooseModule.forFeature([
      {
        name: Invoice.name,
        schema: InvoiceSchema,
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
})
export class AppModule {}
