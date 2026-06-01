/* eslint-disable @typescript-eslint/require-await */
import { Module, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { developmentConfig, productionConfig } from './config';
import * as dotenv from 'dotenv';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import {
  AllExceptionsFilter,
  BadRequestExceptionFilter,
  ForbiddenExceptionFilter,
  NotFoundExceptionFilter,
  UnauthorizedExceptionFilter,
  ValidationExceptionFilter,
} from './filters';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { AuthorizedUsersModule } from './modules/authorized-users/authorized-users.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RedemptionsModule } from './modules/redemptions/redemptions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CronJobService } from './services/cron-job.service';
import { FoodstuffsModule } from './modules/foodstuffs/foodstuffs.module';
import { MedicalModule } from './modules/medical/medical.module';
import { GroceryModule } from './modules/grocery/grocery.module';

dotenv.config();
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, './../../.env'),
      load: process.env.NODE_ENV === 'development' ? [developmentConfig] : [productionConfig],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>(
          process.env.NODE_ENV === 'production' ? 'production.mongodbConnectionUrl' : 'development.mongodbConnectionUrl',
        );
        if (!uri) {
          throw new Error('MongoDB connection URI is undefined');
        }
        const dbName = process.env.NODE_ENV === 'production' ? 'production' : 'test';
        return { uri, dbName: dbName };
      },
      inject: [ConfigService],
    }),
    // MailerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => {
    //     let dev_env = process.env.NODE_ENV as 'development' | 'production';

    //     if (dev_env !== 'development' && dev_env !== 'production') {
    //       dev_env = 'development';
    //     }

    //     return {
    //       transport: {
    //         host: configService.get<string>(`${dev_env}.mail.MAIL_HOST`),
    //         port: configService.get<number>(`${dev_env}.mail.MAIL_PORT`),
    //         secure: false,
    //         auth: {
    //           user: configService.get<string>(`${dev_env}.mail.MAIL_USER`),
    //           pass: configService.get<string>(`${dev_env}.mail.MAIL_PASS`),
    //         },
    //         tls: {
    //           rejectUnauthorized: false,
    //         },
    //       },
    //       defaults: {
    //         from: '"HustTicketing: No Reply" <HustTicketing@HustTicketing.com>',
    //       },
    //       template: {
    //         dir: join(__dirname, './../src/templates'),
    //         adapter: new HandlebarsAdapter(),
    //         options: {
    //           strict: true,
    //         },
    //       },
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
    AuthModule,
    UsersModule,
    AuthorizedUsersModule,
    TicketsModule,
    TransactionsModule,
    RedemptionsModule,
    ReportsModule,
    FoodstuffsModule,
    // Application Modules Go Here
    // Medical records module
    MedicalModule,
    GroceryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CronJobService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: ValidationExceptionFilter },
    { provide: APP_FILTER, useClass: BadRequestExceptionFilter },
    { provide: APP_FILTER, useClass: UnauthorizedExceptionFilter },
    { provide: APP_FILTER, useClass: ForbiddenExceptionFilter },
    { provide: APP_FILTER, useClass: NotFoundExceptionFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          exceptionFactory: (errors: ValidationError[]) => {
            return errors[0];
          },
        }),
    },
  ],
})
export class AppModule {}
