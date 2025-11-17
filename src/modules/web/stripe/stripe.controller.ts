import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { StripeWebhookService } from './stripe.service';

@Controller('stripe')
export class StripeWebhookController {
    constructor(private readonly stripeWebhookService: StripeWebhookService) { }

    @Post('webhook')
    @HttpCode(200)
    async webhook(
        @Req() req: Request,
        @Headers('stripe-signature') signature: string,
    ) {
        return this.stripeWebhookService.handleWebhook(req, signature);
    }
}
