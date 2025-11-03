import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreStatsController } from './stats.controller';
import { StoreStatsService } from './stats.service';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PosSale, PosStock, Product, Store]),
    ],
    controllers: [StoreStatsController],
    providers: [StoreStatsService],
    exports: [StoreStatsService],
})
export class StoreStatsModule { }
