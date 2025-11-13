import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AiSearchInput } from './History/entities/ai_search_input.entity';
import { AiSearchOutput } from './History/entities/ai_search_output.entity';
import { AiHistoryService } from './History/history.service';
import { StoresService } from '../stores/stores.service';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { StoreDetail } from '../stores/entities/store-detail.entity';
import { Store } from '../stores/entities/store.entity';
import { PurchasesFullService } from './Purchases/purchases-full.service';
import { PurchaseFull } from './Purchases/entities/purchase-full.entity';
import { Product } from '../products/entities/product.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([AiSearchInput, AiSearchOutput, Store, StoreDetail, Category, User, PurchaseFull, Product]),
    ],
    controllers: [AppController],
    providers: [AiHistoryService, StoresService, PurchasesFullService],
})
export class AppMobileModule { }
