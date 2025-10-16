import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GeminiIaModule } from './gemini-ia/gemini-ia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GeminiIaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
