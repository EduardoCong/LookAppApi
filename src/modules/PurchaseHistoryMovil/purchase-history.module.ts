import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseHistoryController } from './purchase-history.controller';
import { PurchaseHistoryService } from './purchase-history.service';

import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseApartado } from '../app/Purchases/entities/purchase-apartado.entity';
import { PurchaseFisico } from '../Cart/Entities/purchase-fisico.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            PurchaseFull,
            PurchaseApartado,
            PurchaseFisico,
        ]),
    ],
    controllers: [PurchaseHistoryController],
    providers: [PurchaseHistoryService],
})
export class PurchaseHistoryAppModule { }
