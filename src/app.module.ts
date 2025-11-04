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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Conexión a Neon PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: true,
    }),
    AuthModule,
    StoreStatsModule, //Auth Global
    WebStoresModule, //Endpoints para superadmin
    CategoriesModule,
    UsersModule,
    StoresModule,
    ProductCategoriesModule,
    ProductsModule,
    AdminStoresModule,
    GeminiIaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
