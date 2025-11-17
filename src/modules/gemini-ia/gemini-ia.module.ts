import { Module, forwardRef } from '@nestjs/common';
import { GeminiIaService } from './gemini-ia.service';
import { GeminiIaController } from './gemini-ia.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Store } from '../stores/entities/store.entity';
import { PosSale } from '../stores/entities/pos_sale.entity';
import { PosStock } from '../stores/entities/pos_stock.entity';
import { AiSearchOutput } from '../app/History/entities/ai_search_output.entity';
import { AiSearchInput } from '../app/History/entities/ai_search_input.entity';

import { StoresModule } from '../stores/stores.module';
import { SupabaseService } from 'src/supabase.service';
import { ModesModule } from '../modes/modes.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Store,
      PosSale,
      PosStock,
      AiSearchOutput,
      AiSearchInput,
    ]),

    forwardRef(() => StoresModule),
    forwardRef(() => ModesModule)
  ],

  controllers: [GeminiIaController],

  providers: [GeminiIaService, SupabaseService],

  exports: [GeminiIaService, SupabaseService],
})
export class GeminiIaModule {}
