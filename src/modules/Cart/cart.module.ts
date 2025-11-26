import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';


import { User } from 'src/modules/users/entities/user.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { PurchaseFull } from '../app/Purchases/entities/purchase-full.entity';
import { CartItem } from './Entities/cart-item.entity';
import { PurchaseFisico } from './Entities/purchase-fisico.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            CartItem,
            User,
            Product,
            Store,
            PurchaseFull,
            PurchaseFisico
        ]),
    ],
    controllers: [CartController],
    providers: [CartService],
    exports: [CartService],
})
export class CartModule { }
