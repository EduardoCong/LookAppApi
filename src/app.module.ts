import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GeminiIaModule } from './gemini-ia/gemini-ia.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';

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
    CategoriesModule,
    UsersModule,
    StoresModule,
    GeminiIaModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
