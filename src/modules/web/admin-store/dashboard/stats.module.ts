import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreStatsController } from './stats.controller';
import { StoreStatsService } from './stats.service';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { StoreSubscription } from 'src/modules/stores/entities/store-subscription.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { WebStoresService } from '../../superadmin/stores/web-stores.service';
import { StoreDetail } from 'src/modules/stores/entities/store-detail.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PosSale, PosStock, Product, Store, StoreSubscription, StoreDetail, User]),
    ],
    controllers: [StoreStatsController],
    providers: [StoreStatsService, WebStoresService],
    exports: [StoreStatsService, WebStoresService],
})
export class StoreStatsModule { }
