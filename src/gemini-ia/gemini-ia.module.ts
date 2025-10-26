import { Module } from '@nestjs/common';
import { GeminiIaService } from './gemini-ia.service';
import { GeminiIaController } from './gemini-ia.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [GeminiIaController],
  providers: [GeminiIaService],
  exports: [GeminiIaService],
})
export class GeminiIaModule { }
