import { Module } from '@nestjs/common';
import { GeminiIaService } from './gemini-ia.service';
import { GeminiIaController } from './gemini-ia.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from '../stores/entities/store.entity';
import { PosSale } from '../stores/entities/pos_sale.entity';
import { PosStock } from '../stores/entities/pos_stock.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Store, PosSale, PosStock])],
  controllers: [GeminiIaController],
  providers: [GeminiIaService],
  exports: [GeminiIaService],
})
export class GeminiIaModule { }
