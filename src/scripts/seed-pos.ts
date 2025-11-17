import 'dotenv/config';

import { faker } from "@faker-js/faker";
import { Category } from "src/modules/categories/entities/category.entity";
import { ProductCategory } from "src/modules/product-categories/entities/product-category.entity";
import { Product } from "src/modules/products/entities/product.entity";
import { PosSale } from "src/modules/stores/entities/pos_sale.entity";
import { PosStock } from "src/modules/stores/entities/pos_stock.entity";
import { StoreDetail } from "src/modules/stores/entities/store-detail.entity";
import { StoreSubscription } from "src/modules/stores/entities/store-subscription.entity";
import { Store } from "src/modules/stores/entities/store.entity";
import { User } from "src/modules/users/entities/user.entity";
import { StoreReviewLog } from "src/modules/web-admin/stores/entities/store-review-log.entity";
import { DataSource } from "typeorm";


const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: true,
    synchronize: false,
    entities: [
        Store,
        Product,
        ProductCategory,
        PosStock,
        PosSale,
        User,
        Category,
        StoreDetail,
        StoreReviewLog,
        StoreSubscription
    ],
});


async function seed() {
    await AppDataSource.initialize();

    const storeRepo = AppDataSource.getRepository(Store);
    const productRepo = AppDataSource.getRepository(Product);
    const productCatRepo = AppDataSource.getRepository(ProductCategory);

    const stockRepo = AppDataSource.getRepository(PosStock);
    const saleRepo = AppDataSource.getRepository(PosSale);

    const storeId = 25; // <--- AJUSTA SEGÚN LA TIENDA DE PRUEBA
    const store = await storeRepo.findOne({ where: { id: storeId } });

    if (!store) {
        console.error(`❌ No existe la tienda con id ${storeId}`);
        process.exit(1);
    }

    console.log(`👉 Sembrando datos para la tienda: ${store.business_name}`);

    // -------------------------------------------------------------------
    // STEP 1: Crear productos reales
    // -------------------------------------------------------------------

    const productCategories = await productCatRepo.find();

    if (productCategories.length === 0) {
        console.error('❌ No hay categorías de productos. Llena product_categories primero.');
        process.exit(1);
    }

    const productsToCreate = Array.from({ length: 20 }).map(() => {
        const randomCategory = faker.helpers.arrayElement(productCategories);

        return productRepo.create({
            store,
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            price: parseFloat(faker.commerce.price({ min: 20, max: 500 })),
            imageUrl: 'https://placehold.co/600x600?text=Product', // IMAGEN DUMMY
            stock: faker.number.int({ min: 10, max: 200 }),
            category: randomCategory,
        });
    });

    const createdProducts = await productRepo.save(productsToCreate);

    console.log(`✔ Productos creados: ${createdProducts.length}`);

    // -------------------------------------------------------------------
    // STEP 2: Crear POS STOCK basado en productos reales
    // -------------------------------------------------------------------

    for (const prod of createdProducts) {
        await stockRepo.save(
            stockRepo.create({
                store,
                productId: prod.id,
                productName: prod.name,
                quantity: prod.stock,
                cost: prod.price * 0.6,
            }),
        );
    }

    console.log(`✔ POS Stock generado correctamente.`);

    // -------------------------------------------------------------------
    // STEP 3: Crear POS SALES (ventas reales)
    // -------------------------------------------------------------------

    for (let i = 0; i < 200; i++) {
        const prod = faker.helpers.arrayElement(createdProducts);
        const qty = faker.number.int({ min: 1, max: 5 });
        const createdAt = faker.date.recent({ days: 15 });

        await saleRepo.save(
            saleRepo.create({
                store,
                productId: prod.id,
                productName: prod.name,
                price: prod.price,
                quantity: qty,
                total: +(prod.price * qty).toFixed(2),
                createdAt,
            }),
        );
    }

    console.log(`✔ 200 ventas generadas.`);

    await AppDataSource.destroy();
    console.log('🎉 Seed POS finalizado correctamente.');
}


// Ejecutar seed
seed().catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
});
