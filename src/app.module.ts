import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GeminiIaModule } from './modules/gemini-ia/gemini-ia.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';

import { CategoriesModule } from './modules/categories/categories.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { StoresModule } from './modules/stores/stores.module';
import { AdminStoresModule } from './modules/web-admin/stores/admin-stores.module';
import { WebStoresModule } from './modules/web/superadmin/stores/web-stores.module';
import { StoreStatsModule } from './modules/web/admin-store/dashboard/stats.module';
import { DatabaseService } from './database/database.service';
import { AppMobileModule } from './modules/app/app.module';
import { ModesModule } from './modules/modes/modes.module';
import { StripeWebhookModule } from './modules/web/stripe/stripe-webhook.module';
import { RecoveryPasswordModule } from './modules/recovery-password/recovery-password.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,  // ← IMPORTANTÍSIMO con 587
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      },

      defaults: {
        from: '"Nublink" <no-reply@nublink.com>',
      },
      template: {
        dir: join(__dirname, '../mail/templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },

    }),

    // Conexión a Neon PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    AuthModule,
    StoreStatsModule, //Auth Global
    WebStoresModule, //Endpoints para superadmin
    AppMobileModule,
    CategoriesModule,
    UsersModule,
    StoresModule,
    ProductCategoriesModule,
    ProductsModule,
    // AdminStoresModule,
    GeminiIaModule,
    ModesModule,
    StripeWebhookModule,
    RecoveryPasswordModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})

export class AppModule { }
