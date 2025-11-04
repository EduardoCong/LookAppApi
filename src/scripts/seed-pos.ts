// src/scripts/seed-pos.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Category } from 'src/modules/categories/entities/category.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ProductCategory } from 'src/modules/product-categories/entities/product-category.entity';
import { StoreDetail } from 'src/modules/stores/entities/store-detail.entity';
import { StoreReviewLog } from 'src/modules/web-admin/stores/entities/store-review-log.entity';


const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: true,
    synchronize: true,
    entities: [Store, PosSale, PosStock, User, Category, Product, ProductCategory, StoreDetail, StoreReviewLog],
});

async function seed() {
    await AppDataSource.initialize();

    const storeRepo = AppDataSource.getRepository(Store);
    const saleRepo = AppDataSource.getRepository(PosSale);
    const stockRepo = AppDataSource.getRepository(PosStock);

    const store = await storeRepo.findOne({ where: { id: 9 } });
    if (!store) {
        console.error('⚠️ No existe store id 1 - crea una tienda antes o ajusta el id');
        process.exit(1);
    }

    const products = Array.from({ length: 15 }).map((_, i) => ({
        productId: 1000 + i,
        productName: faker.commerce.productName(),
        quantity: faker.number.int({ min: 0, max: 200 }),
        cost: parseFloat(faker.commerce.price({ min: 10, max: 150 })),
    }));

    for (const p of products) {
        await stockRepo.save(
            stockRepo.create({
                store,
                productId: p.productId,
                productName: p.productName,
                quantity: p.quantity,
                cost: p.cost,
            }),
        );
    }

    for (let i = 0; i < 200; i++) {
        const prod = faker.helpers.arrayElement(products);
        const qty = faker.number.int({ min: 1, max: 5 });
        const price = parseFloat(faker.commerce.price({ min: 20, max: 500 }));
        const createdAt = faker.date.recent({ days: 14 });

        await saleRepo.save(
            saleRepo.create({
                store,
                productId: prod.productId,
                productName: prod.productName,
                price,
                quantity: qty,
                total: +(price * qty).toFixed(2),
                createdAt,
            }),
        );
    }

    await AppDataSource.destroy();
}

seed().catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
});
