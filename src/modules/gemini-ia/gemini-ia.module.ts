import { Module } from '@nestjs/common';
import { GeminiIaService } from './gemini-ia.service';
import { GeminiIaController } from './gemini-ia.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from '../stores/entities/store.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Store])],
  controllers: [GeminiIaController],
  providers: [GeminiIaService],
  exports: [GeminiIaService],
})
export class GeminiIaModule { }
