import {
    Injectable,
    NotFoundException,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { Product } from 'src/modules/products/entities/product.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Store } from 'src/modules/stores/entities/store.entity';

import { ConfigService } from '@nestjs/config';
import { PurchaseFull } from '../app/Purchases/entities/purchase-full.entity';
import { CartItem } from './Entities/cart-item.entity';
import { CartPaymentResult, CartStoreGroup } from './types/cart.types';
import { PurchaseFisico } from './Entities/purchase-fisico.entity';

@Injectable()
export class CartService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(CartItem)
        private readonly cartRepo: Repository<CartItem>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(PurchaseFull)
        private readonly purchaseRepo: Repository<PurchaseFull>,

        @InjectRepository(PurchaseFisico)
        private readonly fisicoRepo: Repository<PurchaseFisico>,


        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(
            this.configService.get<string>('STRIPE_SECRET_KEY')!,
            { apiVersion: '2025-10-29.clover' }
        );
    }
    async addToCart(userId: number, productId: number, quantity: number = 1) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const product = await this.productRepo.findOne({
            where: { id: productId },
            relations: ['store'],
        });
        if (!product) throw new NotFoundException('Producto no encontrado');

        let item = await this.cartRepo.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (item) {
            item.quantity += quantity;
        } else {
            item = this.cartRepo.create({
                user,
                store: product.store,
                product,
                quantity,
            });
        }

        await this.cartRepo.save(item);

        return { ok: true, message: 'Producto agregado al carrito' };
    }
    async removeFromCart(userId: number, productId: number) {
        const item = await this.cartRepo.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (!item) throw new NotFoundException('Producto no está en el carrito');

        await this.cartRepo.remove(item);

        return { ok: true, message: 'Producto eliminado del carrito' };
    }
    async updateQuantity(userId: number, productId: number, quantity: number) {
        if (quantity <= 0)
            return this.removeFromCart(userId, productId);

        const item = await this.cartRepo.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (!item) throw new NotFoundException('Producto no encontrado en el carrito');

        item.quantity = quantity;

        await this.cartRepo.save(item);

        return { ok: true, message: 'Cantidad actualizada' };
    }

    async clearCart(userId: number) {
        await this.cartRepo.delete({ user: { id: userId } });

        return { ok: true, message: 'Carrito limpiado' };
    }

    async getCart(userId: number): Promise<CartStoreGroup[]> {
        const items = await this.cartRepo.find({
            where: { user: { id: userId } },
            relations: ['product', 'store'],
            order: { created_at: 'DESC' },
        });

        const groups: Record<number, CartStoreGroup> = {};

        for (const item of items) {
            const key = item.store.id;

            if (!groups[key]) {
                groups[key] = {
                    storeId: item.store.id,
                    storeName: item.store.business_name,
                    subtotal: 0,
                    items: [],
                };
            }

            const lineTotal = Number(item.product.price) * item.quantity;

            groups[key].items.push({
                productId: item.product.id,
                name: item.product.name,
                price: Number(item.product.price),
                quantity: item.quantity,
                total: lineTotal,
            });

            groups[key].subtotal += lineTotal;
        }

        return Object.values(groups);
    }



    async payCart(userId: number, paymentMethodId: string) {
        const cart = await this.getCart(userId);
        if (!cart || cart.length === 0) {
            throw new BadRequestException('El carrito está vacío');
        }

        // 1. Obtener usuario con stripe_customer_id
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        if (!user.stripe_customer_id) {
            // Si el usuario no tiene customer de Stripe → crear uno
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.name,
            });

            user.stripe_customer_id = customer.id;
            await this.userRepo.save(user);
        }

        // 2. Attach del PaymentMethod al Customer (solo si no está attachado)
        try {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: user.stripe_customer_id,
            });
        } catch (err: any) {
            // Si ya está attachado, Stripe manda error → lo ignoramos
            if (!err.message.includes("already attached")) {
                throw new BadRequestException(
                    `No se pudo adjuntar el método de pago: ${err.message}`,
                );
            }
        }

        const results: CartPaymentResult[] = [];

        // -------------------------------
        //  PAGOS POR CADA TIENDA
        // -------------------------------
        for (const tienda of cart) {
            const store = await this.storeRepo.findOne({ where: { id: tienda.storeId } });
            if (!store) throw new NotFoundException(`Tienda no encontrada`);

            // VALIDACIÓN DE STOCK
            for (const item of tienda.items) {
                const product = await this.productRepo.findOne({ where: { id: item.productId } });
                if (!product) {
                    throw new BadRequestException(`Producto ${item.productId} no existe`);
                }
                if (product.stock < item.quantity) {
                    throw new BadRequestException(
                        `Stock insuficiente en "${product.name}" de la tienda ${store.business_name}`,
                    );
                }
            }

            // CREAR PAYMENTINTENT POR TIENDA
            let paymentIntent;
            try {
                paymentIntent = await this.stripe.paymentIntents.create({
                    amount: Math.round(tienda.subtotal * 100),
                    currency: 'mxn',
                    customer: user.stripe_customer_id,
                    payment_method: paymentMethodId,
                    confirm: true,
                    description: `Compra en ${store.business_name} (${tienda.items.length} productos)`,
                    automatic_payment_methods: {
                        enabled: true,
                        allow_redirects: 'never',
                    },

                });
            } catch (err: any) {
                throw new HttpException(
                    `Stripe error con tienda ${store.business_name}: ${err.message}`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // GUARDAR COMPRAS Y ACTUALIZAR STOCK
            const savedPurchases: any[] = [];

            for (const item of tienda.items) {
                const product = await this.productRepo.findOne({ where: { id: item.productId } });
                if (!product) continue;

                product.stock -= item.quantity;
                await this.productRepo.save(product);

                const purchase = this.purchaseRepo.create({
                    user,
                    store,
                    product,
                    quantity: item.quantity,
                    unit_price: product.price,
                    total_price: item.total,
                    status: 'pendiente',
                });

                await this.purchaseRepo.save(purchase);
                savedPurchases.push(purchase);
            }

            // AGREGAR RESULTADO FINAL
            results.push({
                storeId: tienda.storeId,
                storeName: tienda.storeName,
                subtotal: tienda.subtotal,
                stripe: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    status: paymentIntent.status,
                },
                purchases: savedPurchases,
            });
        }

        // LIMPIAR CARRITO
        await this.clearCart(userId);

        return {
            ok: true,
            message: 'Carrito pagado correctamente',
            results,
        };
    }

    async payCartForStore(userId: number, storeId: number, paymentMethodId: string) {
        // Obtener carrito completo
        const cart = await this.getCart(userId);

        if (!cart || cart.length === 0) {
            throw new BadRequestException('El carrito está vacío');
        }

        // Buscar la tienda específica dentro del carrito
        const tienda = cart.find(t => t.storeId === Number(storeId));
        if (!tienda) {
            throw new BadRequestException('El carrito no contiene productos de esta tienda');
        }

        // 1. Obtener usuario con stripe_customer_id
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        if (!user.stripe_customer_id) {
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.name,
            });

            user.stripe_customer_id = customer.id;
            await this.userRepo.save(user);
        }

        // 2. Attach PaymentMethod
        try {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: user.stripe_customer_id,
            });
        } catch (err: any) {
            if (!err.message.includes('already attached')) {
                throw new BadRequestException(`No se pudo adjuntar el método de pago: ${err.message}`);
            }
        }

        // 3. Validar stock
        for (const item of tienda.items) {
            const product = await this.productRepo.findOne({ where: { id: item.productId } });

            if (!product) {
                throw new BadRequestException(`Producto ${item.productId} no existe`);
            }

            if (product.stock < item.quantity) {
                throw new BadRequestException(
                    `Stock insuficiente en "${product.name}"`
                );
            }
        }

        // 4. Crear PaymentIntent (solo una tienda, un pago)
        let paymentIntent;
        try {
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(tienda.subtotal * 100),
                currency: 'mxn',
                customer: user.stripe_customer_id,
                payment_method: paymentMethodId,
                confirm: true,
                description: `Compra en ${tienda.storeName} (${tienda.items.length} productos)`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });
        } catch (err: any) {
            throw new HttpException(
                `Error con Stripe: ${err.message}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        // 5. Registrar compras y actualizar stock
        const savedPurchases: any[] = [];

        const store = await this.storeRepo.findOne({ where: { id: tienda.storeId } });
        if (!store) throw new NotFoundException('Tienda no encontrada');

        for (const item of tienda.items) {
            const product = await this.productRepo.findOne({ where: { id: item.productId } });
            if (!product) continue;

            product.stock -= item.quantity;
            await this.productRepo.save(product);

            const purchase = this.purchaseRepo.create({
                user,
                store,
                product,
                quantity: item.quantity,
                unit_price: product.price,
                total_price: item.total,
                status: 'pendiente',
            });

            await this.purchaseRepo.save(purchase);
            savedPurchases.push(purchase);
        }

        // 6. Limpiar carrito SOLO de esa tienda
        await this.cartRepo.delete({
            user: { id: userId },
            store: { id: storeId },
        });

        return {
            ok: true,
            message: 'Compra realizada correctamente',
            stripe: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                status: paymentIntent.status,
            },
            purchases: savedPurchases,
        };
    }

    // ===========================================
    //            PAGO FÍSICO MULTI-TIENDA
    // ===========================================
    async payCartFisico(userId: number) {
        const cart = await this.getCart(userId);
        if (!cart.length) throw new BadRequestException('Carrito vacío');

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const EXPIRATION_HOURS = 72;

        const results: {
            storeId: number;
            storeName: string;
            subtotal: number;
            purchases: PurchaseFisico[];
        }[] = [];

        for (const tienda of cart) {
            const store = await this.storeRepo.findOne({
                where: { id: tienda.storeId },
            });
            if (!store) throw new NotFoundException('Tienda no encontrada');

            // ===========================
            // VALIDAR STOCK
            // ===========================
            for (const item of tienda.items) {
                const product = await this.productRepo.findOne({
                    where: { id: item.productId },
                });

                if (!product)
                    throw new NotFoundException(`Producto ${item.productId} no existe`);

                if (product.stock < item.quantity)
                    throw new BadRequestException(
                        `Stock insuficiente en "${product.name}" de ${store.business_name}`,
                    );
            }

            // ===========================
            // PROCESAR COMPRA FÍSICA
            // ===========================
            const saved: PurchaseFisico[] = [];

            for (const item of tienda.items) {
                const product = await this.productRepo.findOne({
                    where: { id: item.productId },
                });

                if (!product)
                    throw new NotFoundException(`Producto ${item.productId} no existe`);

                // 🔥 Ahora TS ya sabe que product NO es null
                product.stock -= item.quantity;
                await this.productRepo.save(product);

                const fisico = this.fisicoRepo.create({
                    user,
                    store,
                    product,
                    quantity: item.quantity,
                    unit_price: product.price,
                    total_price: item.total,
                    status: 'pendiente',
                    expires_at: new Date(Date.now() + EXPIRATION_HOURS * 3600 * 1000),
                });

                await this.fisicoRepo.save(fisico);
                saved.push(fisico);
            }

            results.push({
                storeId: tienda.storeId,
                storeName: tienda.storeName,
                subtotal: tienda.subtotal,
                purchases: saved,
            });
        }

        // ===========================
        // LIMPIAR CARRITO
        // ===========================
        await this.clearCart(userId);

        return {
            ok: true,
            message: 'Compra física generada correctamente',
            results,
        };
    }

    // ===========================================
    //         PAGO FÍSICO SOLO DE UNA TIENDA
    // ===========================================
    async payCartFisicoStore(userId: number, storeId: number) {
        const cart = await this.getCart(userId);
        if (!cart.length) throw new BadRequestException('Carrito vacío');

        const tienda = cart.find(c => c.storeId === storeId);
        if (!tienda)
            throw new BadRequestException('El carrito no contiene productos de esta tienda');

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const store = await this.storeRepo.findOne({ where: { id: storeId } });
        if (!store) throw new NotFoundException('Tienda no encontrada');

        const EXPIRATION_HOURS = 72;

        // VALIDAR STOCK
        for (const item of tienda.items) {
            const product = await this.productRepo.findOne({ where: { id: item.productId } });

            if (!product) throw new NotFoundException(`Producto ${item.productId} no existe`);
            if (product.stock < item.quantity)
                throw new BadRequestException(
                    `Stock insuficiente en "${product.name}" de ${store.business_name}`,
                );
        }

        const saved: PurchaseFisico[] = [];


        for (const item of tienda.items) {
            const product = await this.productRepo.findOne({
                where: { id: item.productId },
            });

            if (!product) {
                throw new NotFoundException(`Producto ${item.productId} no existe`);
            }

            // Ahora TS sabe que product NO es null
            product.stock -= item.quantity;
            await this.productRepo.save(product);

            const fisico = this.fisicoRepo.create({
                user,
                store,
                product,
                quantity: item.quantity,
                unit_price: product.price,
                total_price: item.total,
                status: 'pendiente',
                expires_at: new Date(Date.now() + EXPIRATION_HOURS * 3600 * 1000),
            });

            await this.fisicoRepo.save(fisico);
            saved.push(fisico);
        }


        // LIMPIAR SOLO CARRITO DE ESA TIENDA
        await this.cartRepo.delete({
            user: { id: userId },
            store: { id: storeId },
        });

        return {
            ok: true,
            message: 'Compra física registrada correctamente',
            storeId,
            purchases: saved,
        };
    }

    // ===========================================
    //        PAGO FÍSICO INDIVIDUAL
    // ===========================================
    async payFisicoIndividual(userId: number, productId: number, quantity: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const product = await this.productRepo.findOne({
            where: { id: productId },
            relations: ['store'],
        });
        if (!product) throw new NotFoundException('Producto no encontrado');

        if (product.stock < quantity)
            throw new BadRequestException(
                `Stock insuficiente. Solo quedan ${product.stock} unidades de ${product.name}`,
            );

        const EXPIRATION_HOURS = 72;

        product.stock -= quantity;
        await this.productRepo.save(product);

        const fisico = this.fisicoRepo.create({
            user,
            store: product.store,
            product,
            quantity,
            unit_price: product.price,
            total_price: Number(product.price) * quantity,
            status: 'pendiente',
            expires_at: new Date(Date.now() + EXPIRATION_HOURS * 3600 * 1000),
        });

        await this.fisicoRepo.save(fisico);

        return {
            ok: true,
            message: 'Compra física registrada correctamente',
            purchase: fisico,
        };
    }


}