import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseApartado } from './entities/purchase_apartado.entity';
import { PurchaseFisico } from './entities/purchase_fisico.entity';
import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { GeminiIaService } from 'src/modules/gemini-ia/gemini-ia.service';
import { GeminiIaModule } from 'src/modules/gemini-ia/gemini-ia.module';

@Module({
  imports: [
    GeminiIaModule,
    TypeOrmModule.forFeature([
      PurchaseApartado,
      PurchaseFisico,
      PurchaseFull
    ])
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
