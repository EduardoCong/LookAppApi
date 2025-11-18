import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';
import { Store } from 'src/modules/stores/entities/store.entity';

@Injectable()
export class WebStoresPaymentsService {
    constructor(
        @InjectRepository(StoreSubscriptionPayment)
        private readonly paymentRepo: Repository<StoreSubscriptionPayment>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,
    ) { }

    async getPaymentsByStore(storeId: number) {
        const store = await this.storeRepo.findOne({ where: { id: storeId } });

        if (!store) {
            throw new NotFoundException('La tienda no existe');
        }

        const payments = await this.paymentRepo.find({
            where: { store_id: storeId },
            order: { paid_at: 'DESC' },
        });

        return {
            ok: true,
            storeId,
            payments,
        };
    }

    async getPaymentsSummary() {
        const payments = await this.paymentRepo.find({
            order: { paid_at: 'DESC' },
        });

        const storeIds = [...new Set(payments.map(p => p.store_id))];
        const stores = await this.storeRepo.findByIds(storeIds);

        const storeMap = new Map(stores.map(s => [s.id, s.business_name]));

        const totalRecaudado = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalComisiones = totalRecaudado * 0.10;

        const totalPagados = payments.filter(p => p.status === 'paid').length;
        const tasaExito =
            payments.length === 0 ? 0 : Math.round((totalPagados / payments.length) * 100);

        const ONE_DAY = 1000 * 60 * 60 * 24;

        const getPlan = (amount: number) => {
            if (amount === 500) return 'Premium';
            if (amount === 200) return 'Básico';
            return 'Desconocido';
        };

        // Calcular días restantes y fecha de vencimiento
        const getSubscriptionInfo = (paidAt: Date) => {
            const start = new Date(paidAt);
            const endDate = new Date(start.getTime() + 30 * ONE_DAY);

            const today = new Date();
            const diff = endDate.getTime() - today.getTime();

            const daysLeft = diff <= 0 ? 0 : Math.ceil(diff / ONE_DAY);

            return {
                daysLeft,
                endDate,
            };
        };

        const items = payments.map(p => {
            const { daysLeft, endDate } = getSubscriptionInfo(p.paid_at);

            return {
                transaction_id: p.id,
                store_name: storeMap.get(p.store_id) ?? 'Tienda desconocida',
                amount: p.amount,
                plan: getPlan(Number(p.amount)),
                commission: p.amount * 0.10,
                date: p.paid_at,
                days_left: daysLeft,
                fecha_vencimiento: endDate,
                status: p.status === 'paid' ? 'Pagado' : 'Pendiente',
            };
        });

        return {
            ok: true,
            totalRecaudado,
            totalComisiones,
            tasaExito,
            totalTransacciones: payments.length,
            items,
        };
    }

}
