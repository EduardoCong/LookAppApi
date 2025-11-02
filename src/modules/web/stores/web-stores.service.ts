import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Store, StoreStatus } from 'src/modules/stores/entities/store.entity';
import { User, UserRole } from 'src/modules/users/entities/user.entity';
import { StoreDetail } from 'src/modules/stores/entities/store-detail.entity';

@Injectable()
export class WebStoresService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(StoreDetail) private readonly detailRepo: Repository<StoreDetail>,
        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
            apiVersion: '2025-10-29.clover',
        });
    }

    async registerWithStripe(body: any) {
        const {
            user_name,
            user_email,
            password,
            business_name,
            category_id,
            plan_id,
            payment_method_id,
        } = body;

        try {
            if (
                !user_name ||
                !user_email ||
                !password ||
                !business_name ||
                !category_id ||
                !plan_id ||
                !payment_method_id
            ) {
                throw new HttpException('Faltan campos obligatorios.', HttpStatus.BAD_REQUEST);
            }

            const existingUser = await this.userRepo.findOne({ where: { email: user_email } });
            if (existingUser) {
                throw new HttpException(
                    'Este correo ya está registrado. Intente con otro o inicie sesión.',
                    HttpStatus.CONFLICT,
                );
            }

            const customer = await this.stripe.customers.create({
                name: user_name,
                email: user_email,
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


            const user = this.userRepo.create({
                name: user_name,
                email: user_email,
                password,
                role: UserRole.STORE,
            });
            const savedUser = await this.userRepo.save(user);

            const store = this.storeRepo.create({
                business_name,
                owner_name: body.owner_name,
                address: body.address,
                category: { id: category_id },
                user: savedUser,
                status: StoreStatus.PENDING,
                is_verified: false,
            });
            await this.storeRepo.save(store);

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Tienda registrada y suscripción Stripe creada correctamente.',
                data: {
                    stripe_customer: customer.id,
                    stripe_subscription: subscription.id,
                    invoice_status: invoiceStatus,
                    subscription_status: subscriptionStatus,
                    pdf: invoicePdfUrl
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
}
