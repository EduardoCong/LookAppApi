import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Store, StoreStatus } from 'src/modules/stores/entities/store.entity';
import { User, UserRole } from 'src/modules/users/entities/user.entity';
import { StoreDetail } from 'src/modules/stores/entities/store-detail.entity';
import * as bcrypt from 'bcryptjs';
import { StoreSubscription } from 'src/modules/stores/entities/store-subscription.entity';
import { PosSale } from '../../admin-store/pos/entities/pos-sale.entity';
import { PosStock } from '../../admin-store/pos/entities/pos-stock.entity';
import { faker } from '@faker-js/faker';
import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseApartado } from 'src/modules/app/Purchases/entities/purchase-apartado.entity';
import { StoreSubscriptionPayment } from 'src/modules/stores/entities/store-subscription-payment.entity';

@Injectable()
export class WebStoresService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(StoreDetail) private readonly detailRepo: Repository<StoreDetail>,
        @InjectRepository(PurchaseFull)
        private readonly purchaseFullRepo: Repository<PurchaseFull>,
        @InjectRepository(PurchaseApartado)
        private readonly apartadoRepo: Repository<PurchaseApartado>,
        @InjectRepository(StoreSubscription)
        private readonly subRepo: Repository<StoreSubscription>,

        @InjectRepository(PosSale)
        private readonly saleRepo: Repository<PosSale>,
        @InjectRepository(PosStock)
        private readonly stockRepo: Repository<PosStock>,

        @InjectRepository(StoreSubscriptionPayment)
        private readonly paymentRepo: Repository<StoreSubscriptionPayment>,

        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
            apiVersion: '2025-10-29.clover',
        });
    }
    async registerWithStripe(body: any) {
        const {
            name,
            user_name,
            email,
            user_email,
            password,
            phone,
            username,
            role,
            business_name,
            owner_name,
            address,
            map_url,
            longitude,
            latitude,
            description,
            category_id,
            status,
            plan_id,
            payment_method_id,
        } = body;

        const finalName = name || user_name;
        const finalEmail = email || user_email;

        try {
            if (
                !finalName ||
                !finalEmail ||
                !password ||
                !business_name ||
                !owner_name ||
                !address ||
                !category_id ||
                !plan_id ||
                !payment_method_id
            ) {
                throw new HttpException('Faltan campos obligatorios.', HttpStatus.BAD_REQUEST);
            }

            const existingUser = await this.userRepo.findOne({ where: { email: finalEmail } });
            if (existingUser) {
                throw new HttpException(
                    'Este correo ya está registrado. Intente con otro o inicie sesión.',
                    HttpStatus.CONFLICT,
                );
            }

            // 1. Crear usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            const savedUser = await this.userRepo.save(
                this.userRepo.create({
                    name: finalName,
                    email: finalEmail,
                    password: hashedPassword,
                    phone,
                    username,
                    role: role || UserRole.STORE,
                }),
            );

            // 2. Crear tienda
            const savedStore = await this.storeRepo.save(
                this.storeRepo.create({
                    business_name,
                    owner_name,
                    address,
                    map_url,
                    longitude,
                    latitude,
                    description,
                    category: { id: category_id },
                    user: savedUser,
                    status: (status as StoreStatus) || StoreStatus.PENDING,
                    is_verified: false,
                }),
            );

            // 3. Crear customer en Stripe
            const customer = await this.stripe.customers.create({
                name: finalName,
                email: finalEmail,
                payment_method: payment_method_id,
                invoice_settings: { default_payment_method: payment_method_id },
            });

            // 4. Crear suscripción
            const subscription = await this.stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: this.getPriceId(plan_id) }],
                expand: ['latest_invoice'],
                metadata: {
                    storeId: savedStore.id.toString(),
                    userId: savedUser.id.toString(),
                    planId: plan_id,
                    businessName: business_name,
                },
            });

            const invoice: any = subscription.latest_invoice;

            if (!invoice) {
                throw new HttpException(
                    'No se pudo obtener la factura inicial de Stripe',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const invoiceStatus = invoice.status;
            const subscriptionStatus = subscription.status;

            if (invoiceStatus !== 'paid' || subscriptionStatus !== 'active') {
                throw new HttpException(
                    `El pago no fue exitoso (factura: ${invoiceStatus}, suscripción: ${subscriptionStatus}).`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // 5. Guardar el primer pago en TU BD
            await this.paymentRepo.save({
                store_id: savedStore.id,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency.toUpperCase(),
                stripe_charge_id: invoice.charge,
                stripe_payment_intent_id: invoice.payment_intent,
                status: 'paid',
                paid_at: new Date(invoice.status_transitions.paid_at * 1000),
            });

            // 6. Guardar suscripción
            const subscriptionRecord = this.subRepo.create({
                ...({ store: { id: savedStore.id } } as any),
                stripe_customer_id: customer.id,
                stripe_subscription_id: subscription.id,
                price_id: this.getPriceId(plan_id),
                plan_key: plan_id,
                status: subscription.status,
                current_period_start: new Date(invoice.period_start * 1000),
                current_period_end: new Date(invoice.period_end * 1000),
            });

            await this.subRepo.save(subscriptionRecord);

            // POS data
            await this.initializePosForStore(savedStore.id);

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Usuario, tienda y suscripción Stripe creados correctamente.',
                data: {
                    stripe: {
                        customer_id: customer.id,
                        subscription_id: subscription.id,
                        invoice_pdf: invoice.invoice_pdf ?? null,
                    },
                },
            };

        } catch (error: any) {
            console.error('Error Stripe:', error);
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }



    async getAdminStats() {
        try {
            const totalUsers = await this.userRepo.count();
            const totalStores = await this.storeRepo.count();
            const activeStores = await this.storeRepo.count({
                where: { status: StoreStatus.ACTIVE },
            });
            const pendingStores = await this.storeRepo.count({
                where: { status: StoreStatus.PENDING },
            });

            const stripeSubs = await this.stripe.subscriptions.list({
                status: 'active',
                limit: 100,
            });

            const activeSubscriptions = stripeSubs.data.length;

            return {
                statusCode: HttpStatus.OK,
                message: 'Estadísticas globales obtenidas correctamente.',
                data: {
                    usuarios: {
                        total: totalUsers,
                    },
                    tiendas: {
                        total: totalStores,
                        activas: activeStores,
                        pendientes: pendingStores,
                    },
                    stripe: {
                        suscripciones_activas: activeSubscriptions,
                    },
                },
            };
        } catch (error: any) {
            console.error('Error obteniendo estadísticas:', error);
            throw new HttpException(
                error.message || 'Error al obtener estadísticas del sistema.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }


    private getPriceId(plan: string): string {
        const planLower = plan?.toLowerCase();
        switch (planLower) {
            case 'basico':
                return this.configService.get<string>('STRIPE_PRICE_BASIC')!;
            case 'premium':
                return this.configService.get<string>('STRIPE_PRICE_PREMIUM')!;
            default:
                throw new HttpException('Plan inválido o no configurado.', HttpStatus.BAD_REQUEST);
        }
    }

    /**
    * Inicializa datos de POS (stock + ventas fake) para una tienda nueva
    */
    private async initializePosForStore(storeId: number) {
        const store = await this.storeRepo.findOne({ where: { id: storeId } });
        if (!store) {
            console.warn(`⚠️ No se encontró tienda con id ${storeId}, se omite el seed POS.`);
            return;
        }

        const products = Array.from({ length: 10 }).map(() => ({
            productId: faker.number.int({ min: 1000, max: 9999 }),
            productName: faker.commerce.productName(),
            quantity: faker.number.int({ min: 0, max: 100 }),
            cost: parseFloat(faker.commerce.price({ min: 10, max: 300 })),
        }));

        for (const p of products) {
            await this.stockRepo.save(
                this.stockRepo.create({
                    store,
                    productId: p.productId,
                    productName: p.productName,
                    quantity: p.quantity,
                    cost: p.cost,
                }),
            );
        }

        for (let i = 0; i < 100; i++) {
            const prod = faker.helpers.arrayElement(products);
            const qty = faker.number.int({ min: 1, max: 5 });
            const price = parseFloat(faker.commerce.price({ min: 50, max: 500 }));
            const createdAt = faker.date.recent({ days: 14 });

            await this.saleRepo.save(
                this.saleRepo.create({
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

    }

    async getStoreStats(storeId: number) {
        const store = await this.storeRepo.findOne({ where: { id: storeId } });
        if (!store) {
            throw new HttpException('Tienda no encontrada', HttpStatus.NOT_FOUND);
        }

        // ------------------------------------------
        // 1. FULL PURCHASES RECOGIDAS
        // ------------------------------------------
        const fullPicked = await this.purchaseFullRepo.find({
            where: { store: { id: storeId }, status: 'recogido' },
            relations: ['product'],
        });

        // ------------------------------------------
        // 2. APARTADOS LIQUIDADOS O RECOGIDOS
        // ------------------------------------------
        const apartadoDelivered = await this.apartadoRepo.find({
            where: { store: { id: storeId }, status: 'recogido' },
            relations: ['product'],
        });

        const apartadoLiquidado = await this.apartadoRepo.find({
            where: { store: { id: storeId }, status: 'liquidado' },
            relations: ['product'],
        });

        // ------------------------------------------
        // TOTAL SALES
        // ------------------------------------------
        const total_sales =
            fullPicked.length + apartadoDelivered.length;

        // ------------------------------------------
        // TOTAL REVENUE
        // ------------------------------------------
        const revenueFull = fullPicked.reduce((sum, p) => sum + Number(p.total_price), 0);
        const revenueApartado = [...apartadoDelivered, ...apartadoLiquidado]
            .reduce((sum, p) => sum + Number(p.monto_pagado), 0);

        const total_revenue = revenueFull + revenueApartado;

        // ------------------------------------------
        // AVERAGE RATING (0 si no hay tabla)
        // ------------------------------------------
        let average_rating = 0;
        try {
            const ratings = await this.saleRepo.manager.query(
                `SELECT COALESCE(AVG(rating),0) AS avg FROM product_ratings WHERE store_id = $1`,
                [storeId]
            );
            average_rating = Number(ratings[0]?.avg || 0);
        } catch {
            average_rating = 0;
        }

        // ------------------------------------------
        // VISITS (0 si no hay tabla)
        // ------------------------------------------
        let visits = 0;
        try {
            const v = await this.saleRepo.manager.query(
                `SELECT COUNT(*) AS v FROM store_visits WHERE store_id = $1`,
                [storeId],
            );
            visits = Number(v[0]?.v || 0);
        } catch {
            visits = 0;
        }

        // ------------------------------------------
        // TOP PRODUCT
        // ------------------------------------------
        const allProducts = [
            ...fullPicked.map(p => ({ id: p.product.id, qty: p.quantity, name: p.product.name })),
            ...apartadoDelivered.map(p => ({ id: p.product.id, qty: p.quantity, name: p.product.name })),
            ...apartadoLiquidado.map(p => ({ id: p.product.id, qty: p.quantity, name: p.product.name })),
        ];

        const productTotals = new Map();

        allProducts.forEach(p => {
            productTotals.set(p.id, (productTotals.get(p.id) || 0) + p.qty);
        });

        const topEntry = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0];
        const top_product = topEntry ? allProducts.find(p => p.id === topEntry[0])?.name : null;

        // ------------------------------------------
        // WEEKLY SALES (últimos 7 días)
        // ------------------------------------------
        const now = new Date();
        const weekly_sales = Array.from({ length: 7 }).map((_, i) => {
            const day = new Date(now);
            day.setDate(now.getDate() - i);

            const f = (d: Date) => d.toISOString().split('T')[0];

            const fullCount = fullPicked.filter(p => f(p.updated_at) === f(day)).length;
            const apartadoCount =
                apartadoDelivered.filter(p => f(p.updated_at) === f(day)).length +
                apartadoLiquidado.filter(p => f(p.updated_at) === f(day)).length;

            return fullCount + apartadoCount;
        }).reverse(); // de más antiguo a más reciente

        return {
            ok: true,
            data: {
                total_sales,
                total_revenue,
                average_rating,
                visits,
                top_product,
                weekly_sales,
            },
        };
    }

    async switchPlan(body: any) {
        const { store_id, new_plan_id } = body;

        if (!store_id || !new_plan_id) {
            throw new HttpException(
                'store_id y new_plan_id son obligatorios.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const subscription = await this.subRepo.findOne({
            where: { store: { id: store_id } },
        });

        if (!subscription) {
            throw new HttpException(
                'No existe una suscripción activa para esta tienda.',
                HttpStatus.NOT_FOUND,
            );
        }

        const newPriceId = this.getPriceId(new_plan_id);

        if (!subscription.stripe_subscription_id || !subscription.stripe_customer_id) {
            throw new HttpException(
                'La suscripción Stripe no tiene IDs válidos.',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const stripeSubscriptionId = subscription.stripe_subscription_id;
            const stripeCustomerId = subscription.stripe_customer_id;

            const canceled = await this.stripe.subscriptions.cancel(
                stripeSubscriptionId,
                {
                    invoice_now: false,
                    prorate: false,
                }
            );

            console.log('CANCELED SUB =>', canceled.id);

            const newSub = await this.stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: newPriceId }],
                expand: ['latest_invoice'],
            });

            const inv =
                typeof newSub.latest_invoice === 'object'
                    ? (newSub.latest_invoice as any)
                    : null;

            const periodStart =
                inv?.period_start
                    ? new Date(inv.period_start * 1000)
                    : newSub.start_date
                        ? new Date(newSub.start_date * 1000)
                        : undefined;

            const periodEnd =
                inv?.period_end
                    ? new Date(inv.period_end * 1000)
                    : undefined;

            const invoicePdf = inv?.invoice_pdf ?? null;

            subscription.stripe_subscription_id = newSub.id;
            subscription.price_id = newPriceId;
            subscription.plan_key = new_plan_id;
            subscription.status = newSub.status;
            subscription.current_period_start = periodStart;
            subscription.current_period_end = periodEnd;

            await this.subRepo.save(subscription);

            return {
                ok: true,
                message: 'Plan cambiado correctamente.',
                data: {
                    subscription_id: newSub.id,
                    new_plan: new_plan_id,
                    status: newSub.status,
                    period_start: periodStart,
                    period_end: periodEnd,
                    invoice_pdf: invoicePdf,
                },
            };

        } catch (error: any) {
            console.error('Error switching plan:', error);
            throw new HttpException(
                error.message || 'No se pudo cambiar el plan.',
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
