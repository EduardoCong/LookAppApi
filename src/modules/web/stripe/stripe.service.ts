import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';

@Injectable()
export class StripeWebhookService {
    private readonly stripe: Stripe;
    private readonly logger = new Logger('StripeWebhook');

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(StoreSubscriptionPayment)
        private readonly paymentRepo: Repository<StoreSubscriptionPayment>,
    ) {
        this.stripe = new Stripe(
            config.get<string>('STRIPE_SECRET_KEY')!,
            { apiVersion: '2025-10-29.clover' }
        );
    }

    async handleWebhook(req: any, signature: string) {
        let event: Stripe.Event;

        const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!secret) {
            throw new BadRequestException('STRIPE_WEBHOOK_SECRET no está configurado');
        }

        try {
            event = this.stripe.webhooks.constructEvent(
                req.rawBody,
                signature,
                secret,
            );
        } catch (err: any) {
            throw new BadRequestException(`Webhook signature invalid: ${err.message}`);
        }

        switch (event.type) {
            case 'charge.succeeded':
                await this.handleChargeSucceeded(event);
                break;
        }

        return { received: true };
    }

    private async handleChargeSucceeded(event: Stripe.Event) {
        const charge = event.data.object as Stripe.Charge;

        if (!charge.metadata?.storeId) {
            this.logger.error('No metadata.storeId en el pago');
            return;
        }

        await this.paymentRepo.save({
            store_id: parseInt(charge.metadata.storeId),
            amount: charge.amount / 100,
            currency: charge.currency.toUpperCase(),
            stripe_charge_id: charge.id,
            stripe_payment_intent_id: charge.payment_intent as string,
            status: 'paid',
            paid_at: new Date(charge.created * 1000),
        });

        this.logger.log(
            `Pago guardado para la tienda ${charge.metadata.storeId}`
        );
    }
}
