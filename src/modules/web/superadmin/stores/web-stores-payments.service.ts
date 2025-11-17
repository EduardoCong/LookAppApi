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
}
