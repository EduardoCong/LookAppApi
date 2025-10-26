import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Store } from 'src/stores/entities/store.entity';
import { GeminiIaModule } from 'src/gemini-ia/gemini-ia.module';
import { ProductCategory } from 'src/product-categories/entities/product-category.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Product, Store, ProductCategory]), GeminiIaModule],
    controllers: [ProductsController],
    providers: [ProductsService],
})
export class ProductsModule { }
