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
import { AdminStoresService } from 'src/modules/web-admin/stores/admin-stores.service';
import { StoreReviewLog } from 'src/modules/web-admin/stores/entities/store-review-log.entity';
import { StoresService } from 'src/modules/stores/stores.service';
import { Category } from 'src/modules/categories/entities/category.entity';
import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseApartado } from 'src/modules/app/Purchases/entities/purchase-apartado.entity';
import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';
import { WebStoresPaymentsService } from './web-stores-payments.service';

@Module({
    imports: [TypeOrmModule.forFeature([Store, StoreDetail, User, StoreSubscription, PosSale, PosStock, StoreReviewLog, Category, PurchaseFull, PurchaseApartado, StoreSubscriptionPayment]), ConfigModule],
    controllers: [WebStoresController],
    providers: [WebStoresService, AdminStoresService, StoresService, WebStoresPaymentsService],
})
export class WebStoresModule { }
