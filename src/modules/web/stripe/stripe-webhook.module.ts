import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';
import { StripeWebhookController } from './stripe.controller';
import { StripeWebhookService } from './stripe.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([StoreSubscriptionPayment]),
    ],
    controllers: [StripeWebhookController],
    providers: [StripeWebhookService],
})
export class StripeWebhookModule { }
