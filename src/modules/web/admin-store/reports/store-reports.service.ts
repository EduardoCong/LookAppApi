import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { Store } from 'src/modules/stores/entities/store.entity';

@Injectable()
export class StoreReportsService {
    constructor(
        @InjectRepository(PosSale)
        private readonly salesRepo: Repository<PosSale>,

        @InjectRepository(PosStock)
        private readonly stockRepo: Repository<PosStock>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,
    ) { }

    /**
     * 🔹 Reporte general de ventas por rango de fechas
     * GET /web/stores/mine/reports/sales?from=2025-01-01&to=2025-01-31
     */
    async getSalesReport(storeId: number, from?: string, to?: string) {
        if (!storeId) {
            throw new HttpException('Falta el ID de la tienda.', HttpStatus.BAD_REQUEST);
        }

        const startDate = from ? new Date(from) : new Date('2000-01-01');
        const endDate = to ? new Date(to) : new Date();

        const sales = await this.salesRepo.find({
            where: { store: { id: storeId }, createdAt: Between(startDate, endDate) },
            order: { createdAt: 'DESC' },
        });

        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total ?? 0), 0);
        const totalUnits = sales.reduce((sum, s) => sum + Number(s.quantity ?? 0), 0);

        const groupedByProduct: Record<string, any> = {};

        for (const sale of sales) {
            const key = sale.productName ?? `ID-${sale.productId}`;
            if (!groupedByProduct[key]) {
                groupedByProduct[key] = {
                    productId: sale.productId,
                    productName: sale.productName,
                    units: 0,
                    revenue: 0,
                };
            }
            groupedByProduct[key].units += Number(sale.quantity ?? 0);
            groupedByProduct[key].revenue += Number(sale.total ?? 0);
        }

        const products = Object.values(groupedByProduct).sort(
            (a, b) => b.revenue - a.revenue,
        );

        return {
            range: { from: startDate, to: endDate },
            summary: {
                total_sales: sales.length,
                total_revenue: Number(totalRevenue.toFixed(2)),
                total_units: totalUnits,
                avg_ticket: sales.length ? Number((totalRevenue / sales.length).toFixed(2)) : 0,
            },
            products,
        };
    }

    /**
     * 🔹 Reporte de inventario (stock actual)
     * GET /web/stores/mine/reports/inventory
     */
    async getInventoryReport(storeId: number) {
        if (!storeId) {
            throw new HttpException('Falta el ID de la tienda.', HttpStatus.BAD_REQUEST);
        }

        const stock = await this.stockRepo.find({
            where: { store: { id: storeId } },
            order: { quantity: 'ASC' },
        });

        const totalProducts = stock.length;
        const totalUnits = stock.reduce((sum, s) => sum + Number(s.quantity ?? 0), 0);
        const lowStock = stock.filter((s) => Number(s.quantity) < 10).length;

        return {
            summary: {
                total_products: totalProducts,
                total_units: totalUnits,
                low_stock: lowStock,
            },
            stock: stock.map((s) => ({
                productId: s.productId,
                productName: s.productName,
                quantity: Number(s.quantity ?? 0),
                cost: Number(s.cost ?? 0),
            })),
        };
    }

    /**
     * 🔹 Reporte de desempeño diario (ventas agrupadas por día)
     * GET /web/stores/mine/reports/daily
     */
    async getDailyPerformance(storeId: number, from?: string, to?: string) {
        if (!storeId) {
            throw new HttpException('Falta el ID de la tienda.', HttpStatus.BAD_REQUEST);
        }

        const startDate = from ? new Date(from) : new Date('2000-01-01');
        const endDate = to ? new Date(to) : new Date();

        const sales = await this.salesRepo.find({
            where: { store: { id: storeId }, createdAt: Between(startDate, endDate) },
            order: { createdAt: 'ASC' },
        });

        const grouped: Record<string, { total: number; count: number }> = {};

        for (const s of sales) {
            const day = s.createdAt.toISOString().split('T')[0];
            if (!grouped[day]) grouped[day] = { total: 0, count: 0 };
            grouped[day].total += Number(s.total ?? 0);
            grouped[day].count++;
        }

        const daily = Object.entries(grouped).map(([date, data]) => ({
            date,
            total_revenue: Number(data.total.toFixed(2)),
            total_sales: data.count,
            avg_ticket: data.count ? Number((data.total / data.count).toFixed(2)) : 0,
        }));

        return {
            range: { from: startDate, to: endDate },
            days: daily.sort((a, b) => a.date.localeCompare(b.date)),
        };
    }
}
