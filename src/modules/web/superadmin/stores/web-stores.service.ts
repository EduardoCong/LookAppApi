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

@Injectable()
export class WebStoresService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(StoreDetail) private readonly detailRepo: Repository<StoreDetail>,
        @InjectRepository(StoreSubscription)
        private readonly subRepo: Repository<StoreSubscription>,

        @InjectRepository(PosSale)
        private readonly saleRepo: Repository<PosSale>,
        @InjectRepository(PosStock)
        private readonly stockRepo: Repository<PosStock>,

        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
            apiVersion: '2025-10-29.clover',
        });
    }
    async registerWithStripe(body: any) {
        const {
            // Datos de usuario (se aceptan ambas variantes)
            name,
            user_name,
            email,
            user_email,
            password,
            phone,
            username,
            role,

            // Datos de tienda
            business_name,
            owner_name,
            address,
            map_url,
            longitude,
            latitude,
            description,
            category_id,
            status,

            // Stripe
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
                throw new HttpException(
                    'Faltan campos obligatorios.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const existingUser = await this.userRepo.findOne({ where: { email: finalEmail } });
            if (existingUser) {
                throw new HttpException(
                    'Este correo ya está registrado. Intente con otro o inicie sesión.',
                    HttpStatus.CONFLICT,
                );
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const customer = await this.stripe.customers.create({
                name: finalName,
                email: finalEmail,
                payment_method: payment_method_id,
                invoice_settings: { default_payment_method: payment_method_id },
            });


            const subscription = await this.stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: this.getPriceId(plan_id) }],
                expand: ['latest_invoice'],
            });

            const invoice: any = subscription.latest_invoice;
            const invoiceStatus = invoice?.status ?? 'unknown';
            const subscriptionStatus = subscription.status ?? 'unknown';
            const invoicePdfUrl: string | null = invoice?.invoice_pdf ?? null;


            if (invoiceStatus !== 'paid' && subscriptionStatus !== 'active') {
                throw new HttpException(
                    `El pago no fue exitoso (factura: ${invoiceStatus}, suscripción: ${subscriptionStatus}).`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            const newUser = this.userRepo.create({
                name: finalName,
                email: finalEmail,
                password: hashedPassword,
                phone,
                username,
                role: role || UserRole.STORE,
            });
            const savedUser = await this.userRepo.save(newUser);

            const newStore = this.storeRepo.create({
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
            });

            const savedStore = await this.storeRepo.save(newStore);
            savedUser.store = savedStore;
            await this.userRepo.save(savedUser);

            const subData = subscription as any;

            const current_period_start =
                subData.latest_invoice?.period_start
                    ? new Date(subData.latest_invoice.period_start * 1000)
                    : subData.start_date
                        ? new Date(subData.start_date * 1000)
                        : null;

            const current_period_end =
                subData.latest_invoice?.period_end
                    ? new Date(subData.latest_invoice.period_end * 1000)
                    : null;

            const subscriptionRecord = this.subRepo.create({
                ...({ store: { id: savedStore.id } } as any),
                stripe_customer_id: customer.id,
                stripe_subscription_id: subData.id,
                price_id: this.getPriceId(plan_id),
                plan_key: plan_id,
                status: subData.status,
                current_period_start,
                current_period_end,
            });

            await this.subRepo.save(subscriptionRecord);
            await this.initializePosForStore(savedStore.id);

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Usuario, tienda y suscripción Stripe creados correctamente.',
                data: {
                    stripe: {
                        customer_id: customer.id,
                        subscription_id: subscription.id,
                        invoice_status: invoiceStatus,
                        subscription_status: subscriptionStatus,
                        invoice_pdf: invoicePdfUrl,
                    },
                },
            };
        } catch (error: any) {
            console.error('Error Stripe:', error);
            throw new HttpException(
                error.message || 'Error al procesar el pago con Stripe.',
                HttpStatus.BAD_REQUEST,
            );
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
}
