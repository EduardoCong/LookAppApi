import {
    Injectable,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseFull } from './entities/purchase-full.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PurchasesFullService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(PurchaseFull)
        private readonly purchaseRepo: Repository<PurchaseFull>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
            apiVersion: '2025-10-29.clover',
        });
    }

    async createPurchase(
        userId: number,
        storeId: number,
        productId: number,
        quantity: number,
        paymentMethodId: string,
    ) {
        const product = await this.productRepo.findOne({ where: { id: productId } });
        if (!product) throw new NotFoundException('Producto no encontrado');

        const store = await this.storeRepo.findOne({ where: { id: storeId } });
        if (!store) throw new NotFoundException('Tienda no encontrada');

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        if (product.stock <= 0) {
            throw new BadRequestException(`El producto "${product.name}" está agotado.`);
        }

        if (product.stock < quantity) {
            throw new BadRequestException(
                `Solo quedan ${product.stock} unidades disponibles de "${product.name}".`,
            );
        }


        const total = Number(product.price) * quantity;

        let paymentIntent;
        try {
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(total * 100),
                currency: 'mxn',
                payment_method: paymentMethodId,
                confirm: true,
                description: `Compra en ${store.business_name} - ${product.name}`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });


            console.log('PaymentIntent creado:', paymentIntent);
        } catch (err: any) {
            throw new HttpException(
                `Error al procesar el pago con Stripe: ${err.message}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
            throw new BadRequestException(
                `El pago no fue exitoso (estado: ${paymentIntent?.status || 'desconocido'})`,
            );
        }

        product.stock -= quantity;
        await this.productRepo.save(product);

        const purchase = this.purchaseRepo.create({
            product,
            store,
            user,
            quantity,
            unit_price: product.price,
            total_price: total,
            status: 'pendiente',
        });

        await this.purchaseRepo.save(purchase);

        return {
            ok: true,
            message: 'Pago verificado y compra registrada correctamente',
            data: {
                purchase_id: purchase.id,
                product: product.name,
                store: store.business_name,
                quantity,
                total,
                stripe: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                },
            },
        };
    }
}
