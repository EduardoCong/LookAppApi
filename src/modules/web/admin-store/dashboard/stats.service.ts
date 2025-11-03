import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { subDays, startOfDay } from 'date-fns';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { StoreSubscription } from 'src/modules/stores/entities/store-subscription.entity';

@Injectable()
export class StoreStatsService {
    constructor(
        @InjectRepository(PosSale)
        private readonly salesRepo: Repository<PosSale>,

        @InjectRepository(PosStock)
        private readonly stockRepo: Repository<PosStock>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(StoreSubscription)
        private readonly subRepo: Repository<StoreSubscription>,
    ) { }

    async getStatsForStore(storeId: number) {
        const today = new Date();
        const last7 = subDays(startOfDay(today), 6);

        // 🔹 Cargar ventas recientes y stock
        const sales = await this.salesRepo.find({
            where: { store: { id: storeId }, createdAt: Between(last7, today) },
        });

        const stock = await this.stockRepo.find({
            where: { store: { id: storeId } },
        });

        // --- Totales generales ---
        const totalSales = sales.length;
        const totalRevenue = sales.reduce(
            (sum, s) => sum + Number(s.total ?? 0),
            0,
        );
        const averageTicket = totalSales ? totalRevenue / totalSales : 0;
        const totalProducts = stock.reduce(
            (sum, s) => sum + Number(s.quantity ?? 0),
            0,
        );
        const lowStock = stock.filter((s) => Number(s.quantity) < 10).length;

        // --- Productos más y menos vendidos ---
        const productSalesMap = new Map<
            number,
            { name: string; units: number; revenue: number }
        >();

        for (const sale of sales) {
            const existing = productSalesMap.get(sale.productId) || {
                name: sale.productName,
                units: 0,
                revenue: 0,
            };

            existing.units += Number(sale.quantity ?? 0);
            existing.revenue += Number(sale.total ?? 0);
            productSalesMap.set(sale.productId, existing);
        }

        const sortedSales = Array.from(productSalesMap.entries()).sort(
            (a, b) => b[1].units - a[1].units,
        );

        const highestSelling =
            sortedSales.length > 0
                ? {
                    productId: sortedSales[0][0],
                    productName: sortedSales[0][1].name,
                    units_sold: sortedSales[0][1].units,
                    revenue: Number(sortedSales[0][1].revenue).toFixed(2),
                }
                : null;

        const lowestSelling =
            sortedSales.length > 0
                ? {
                    productId: sortedSales[sortedSales.length - 1][0],
                    productName: sortedSales[sortedSales.length - 1][1].name,
                    units_sold: sortedSales[sortedSales.length - 1][1].units,
                    revenue: Number(
                        sortedSales[sortedSales.length - 1][1].revenue,
                    ).toFixed(2),
                }
                : null;

        // --- Mejor y peor stock ---
        const sortedStock = stock.sort(
            (a, b) => Number(b.quantity) - Number(a.quantity),
        );

        const bestStocked = sortedStock[0]
            ? {
                productId: sortedStock[0].productId,
                productName: sortedStock[0].productName,
                quantity: Number(sortedStock[0].quantity),
            }
            : null;

        const worstStocked = sortedStock[sortedStock.length - 1]
            ? {
                productId: sortedStock[sortedStock.length - 1].productId,
                productName:
                    sortedStock[sortedStock.length - 1].productName,
                quantity: Number(sortedStock[sortedStock.length - 1].quantity),
            }
            : null;

        // --- Últimas ventas ---
        const lastSales = sales
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
            .slice(0, 5)
            .map((s) => ({
                productName: s.productName,
                total: Number(s.total).toFixed(2),
                quantity: Number(s.quantity),
                createdAt: s.createdAt,
            }));

        // --- Resultado final ---
        return {
            total_sales: totalSales,
            total_revenue: Number(totalRevenue.toFixed(2)),
            average_ticket: Number(averageTicket.toFixed(2)),
            total_products: totalProducts,
            low_stock: lowStock,
            highest_selling_product: highestSelling,
            lowest_selling_product: lowestSelling,
            best_stocked_product: bestStocked,
            worst_stocked_product: worstStocked,
            last_sales: lastSales,
        };
    }

    async getProductsByRole(user: any) {
        // Si es superadmin → devuelve todo
        if (user.role === 'superadmin') {
            return await this.productRepo.find({
                relations: ['store', 'category'],
                order: { id: 'DESC' },
            });
        }

        // Si es tienda → filtra por storeId
        if (user.role === 'store') {
            const storeId = user.storeId;
            if (!storeId) {
                throw new Error('No se pudo determinar el storeId del token.');
            }

            return await this.productRepo.find({
                where: { store: { id: storeId } },
                relations: ['store', 'category'],
                order: { id: 'DESC' },
            });
        }

        // En cualquier otro caso, acceso denegado
        throw new Error('Rol no autorizado para acceder a productos.');
    }

    async getSubscriptionDetail(storeId: number) {
        const subscription = await this.subRepo.findOne({
            where: { store: { id: storeId } },
            order: { created_at: 'DESC' },
        });

        if (!subscription) {
            throw new HttpException('No se encontró suscripción activa para esta tienda.', HttpStatus.NOT_FOUND);
        }

        return {
            plan: subscription.plan_key,
            price_id: subscription.price_id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            stripe_customer_id: subscription.stripe_customer_id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            created_at: subscription.created_at,
        };
    }

}
