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
import { StoresModule } from 'src/modules/stores/stores.module';
import { StoresService } from 'src/modules/stores/stores.service';
import { Category } from 'src/modules/categories/entities/category.entity';
import { StoreReportsService } from '../reports/store-reports.service';
import { PurchasesFullService } from 'src/modules/app/Purchases/purchases-full.service';
import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseApartado } from 'src/modules/app/Purchases/entities/purchase-apartado.entity';
import { PurchaseApartadoService } from 'src/modules/app/Purchases/purchase-apartado.service';
import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';
import { PurchaseFisicoService } from 'src/modules/app/Purchases/purchase-fisico.service';
import { PurchaseFisico } from 'src/modules/Cart/Entities/purchase-fisico.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PosSale, PosStock, Product, Store, StoreSubscription, StoreDetail, User, Category, PurchaseFull, PurchaseApartado, StoreSubscriptionPayment, PurchaseFisico]),
    ],
    controllers: [StoreStatsController],
    providers: [StoreStatsService, WebStoresService, StoresService, StoreReportsService, PurchasesFullService, PurchaseApartadoService, PurchaseFisicoService],
    exports: [StoreStatsService, WebStoresService, StoresService, StoreReportsService, PurchasesFullService, PurchaseApartadoService, PurchaseFisicoService],
})
export class StoreStatsModule { }
