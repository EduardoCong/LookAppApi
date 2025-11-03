import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/modules/stores/entities/store.entity';
import { StoreDetail } from 'src/modules/stores/entities/store-detail.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { WebStoresController } from './web-stores.controller';
import { WebStoresService } from './web-stores.service';
import { StoreSubscription } from 'src/modules/stores/entities/store-subscription.entity';
import { PosSale } from '../../admin-store/pos/entities/pos-sale.entity';
import { PosStock } from '../../admin-store/pos/entities/pos-stock.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Store, StoreDetail, User, StoreSubscription, PosSale, PosStock]), ConfigModule],
    controllers: [WebStoresController],
    providers: [WebStoresService],
})
export class WebStoresModule { }
