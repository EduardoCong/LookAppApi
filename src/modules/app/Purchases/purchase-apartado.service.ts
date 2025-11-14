import {
    Injectable,
    NotFoundException,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseApartado } from './entities/purchase-apartado.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PurchaseApartadoService {
    private readonly stripe: Stripe;

    constructor(
        @InjectRepository(PurchaseApartado)
        private readonly apartadoRepo: Repository<PurchaseApartado>,

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

    /**
     * Crear un apartado
     */
    async createApartado(
        userId: number,
        storeId: number,
        productId: number,
        quantity: number,
        porcentaje: number,
        paymentMethodId: string
    ) {
        // 1. Validar entidades
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
                `Solo quedan ${product.stock} unidades disponibles de "${product.name}".`
            );
        }

        // 2. Cálculos
        const total = Number(product.price) * quantity;

        if (porcentaje < 1 || porcentaje > 100) {
            throw new BadRequestException('El porcentaje debe ser entre 1 y 100');
        }

        const montoPagado = Number(((porcentaje / 100) * total).toFixed(2));
        const saldoPendiente = Number((total - montoPagado).toFixed(2));

        // -------------------------------
        // 3. CREAR O RECUPERAR CUSTOMER
        // -------------------------------
        const customerId = await this.getOrCreateCustomer(user);

        // -------------------------------
        // 4. Adjuntar PaymentMethod al Customer
        // -------------------------------
        try {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
        } catch (err: any) {
            throw new BadRequestException(
                `No se pudo adjuntar el método de pago: ${err.message}`
            );
        }

        // -------------------------------
        // 5. Crear PaymentIntent
        // -------------------------------
        let paymentIntent;
        try {
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(montoPagado * 100),
                currency: 'mxn',
                customer: customerId, // ✔ CORRECTO
                payment_method: paymentMethodId,
                confirm: true,
                description: `Anticipo de apartado en ${store.business_name} - ${product.name}`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });
        } catch (err: any) {
            throw new HttpException(
                `Error al procesar el anticipo con Stripe: ${err.message}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
            throw new BadRequestException(
                `El pago no fue exitoso (estado: ${paymentIntent?.status || 'desconocido'})`
            );
        }

        // 6. Restar stock
        product.stock -= quantity;
        await this.productRepo.save(product);

        // 7. Registrar apartado
        const apartado = this.apartadoRepo.create({
            product,
            store,
            user,
            quantity,
            unit_price: product.price,
            total_price: total,
            porcentaje_pagado: porcentaje,
            monto_pagado: montoPagado,
            saldo_pendiente: saldoPendiente,
            saldo_final: total,
            status: 'apartado',
        });

        await this.apartadoRepo.save(apartado);

        return {
            ok: true,
            message: 'Anticipo cobrado y apartado registrado correctamente',
            data: {
                id: apartado.id,
                product: product.name,
                store: store.business_name,
                quantity,
                porcentaje_pagado: porcentaje,
                monto_pagado: montoPagado,
                saldo_pendiente: saldoPendiente,
                saldo_final: total,
                stripe: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                },
            },
        };
    }

    // ----------------------------------------
    // MÉTODO CORRECTO PARA CUSTOMER
    // ----------------------------------------
    private async getOrCreateCustomer(user: User): Promise<string> {
        if (user.stripe_customer_id) return user.stripe_customer_id;

        // Crear customer en Stripe
        const customer = await this.stripe.customers.create({
            name: user.name,
            email: user.email,
        });

        user.stripe_customer_id = customer.id;
        await this.userRepo.save(user);

        return customer.id;
    }
    async pagarApartado(
        userId: number,
        apartadoId: number,
        monto: number,
        paymentMethodId: string
    ) {
        // 1. Buscar apartado
        const apartado = await this.apartadoRepo.findOne({
            where: { id: apartadoId },
            relations: ['user', 'store', 'product'],
        });

        if (!apartado) throw new NotFoundException('Apartado no encontrado');

        if (apartado.user.id !== userId) {
            throw new BadRequestException('Este apartado no pertenece al usuario');
        }

        // Ya está liquidado
        if (apartado.status === 'liquidado') {
            throw new BadRequestException('Este apartado ya está liquidado');
        }

        // Convertir numerics de Postgres a number nativo
        const montoPagadoActual = Number(apartado.monto_pagado);
        const saldoPendienteActual = Number(apartado.saldo_pendiente);
        const total = Number(apartado.total_price);

        // Validamos que haya saldo pendiente
        if (saldoPendienteActual <= 0) {
            throw new BadRequestException('Este apartado ya no tiene saldo pendiente');
        }

        // Validar monto enviado
        if (monto <= 0) {
            throw new BadRequestException('El monto debe ser mayor a 0');
        }

        if (monto > saldoPendienteActual) {
            throw new BadRequestException(
                `El monto excede el saldo pendiente de ${saldoPendienteActual}`
            );
        }

        // Obtener usuario
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // Crear/recuperar customer
        const customerId = await this.getOrCreateCustomer(user);

        // Adjuntar método de pago
        try {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });
        } catch (err: any) {
            throw new BadRequestException(
                `No se pudo adjuntar el método de pago: ${err.message}`
            );
        }

        // Crear PaymentIntent con el monto indicado
        let paymentIntent;
        try {
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(monto * 100),
                currency: 'mxn',
                customer: customerId,
                payment_method: paymentMethodId,
                confirm: true,
                description: `Pago parcial de apartado: ${apartado.product.name}`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });
        } catch (err: any) {
            throw new HttpException(
                `Error al procesar el pago con Stripe: ${err.message}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (paymentIntent.status !== 'succeeded') {
            throw new BadRequestException(`Pago fallido: ${paymentIntent.status}`);
        }

        // -------------------------
        // ACTUALIZAR MONTOS CORRECTAMENTE
        // -------------------------

        const nuevoMontoPagado = Number((montoPagadoActual + monto).toFixed(2));
        const nuevoSaldoPendiente = Number((total - nuevoMontoPagado).toFixed(2));

        apartado.monto_pagado = nuevoMontoPagado;
        apartado.saldo_pendiente = nuevoSaldoPendiente;

        apartado.porcentaje_pagado = Number(
            ((nuevoMontoPagado / total) * 100).toFixed(2)
        );

        // Si ya pagó todo, cambiar status
        if (nuevoSaldoPendiente <= 0) {
            apartado.saldo_pendiente = 0;
            apartado.porcentaje_pagado = 100;
            apartado.status = 'liquidado';
        }

        await this.apartadoRepo.save(apartado);

        return {
            ok: true,
            message:
                apartado.status === 'liquidado'
                    ? 'Apartado liquidado completamente'
                    : 'Pago parcial registrado correctamente',
            data: {
                id: apartado.id,
                monto_pagado: apartado.monto_pagado,
                porcentaje_pagado: apartado.porcentaje_pagado,
                saldo_pendiente: apartado.saldo_pendiente,
                status: apartado.status,
                stripe: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                },
            },
        };
    }

    async marcarComoRecogido(
        userId: number,
        apartadoId: number,
    ) {
        // Buscar el apartado
        const apartado = await this.apartadoRepo.findOne({
            where: { id: apartadoId },
            relations: ['user', 'store', 'product'],
        });

        if (!apartado) {
            throw new NotFoundException('Apartado no encontrado');
        }

        // Validar que sea del usuario
        if (apartado.user.id !== userId) {
            throw new BadRequestException('Este apartado no pertenece al usuario');
        }

        // Ya está entregado
        if (apartado.status === 'recogido') {
            throw new BadRequestException('Este apartado ya fue marcado como recogido');
        }

        // Validar que esté LIQUIDADO antes de entregar
        if (apartado.status !== 'liquidado') {
            throw new BadRequestException(
                'No se puede entregar el producto hasta que esté completamente liquidado'
            );
        }


        apartado.status = 'recogido';

        await this.apartadoRepo.save(apartado);

        return {
            ok: true,
            message: 'Producto marcado como recogido correctamente',
            data: {
                id: apartado.id,
                product: apartado.product.name,
                store: apartado.store.business_name,
                status: apartado.status,
                pickup_date: apartado.updated_at,
            },
        };
    }

    async getApartadosByStatus(
        userId: number,
        status?: 'apartado' | 'liquidado' | 'recogido'
    ) {
        // Estatus válidos
        const validStatuses = ['apartado', 'liquidado', 'recogido'];

        // Validar status si viene
        if (status && !validStatuses.includes(status)) {
            throw new BadRequestException(
                `El estatus debe ser uno de: ${validStatuses.join(', ')}`
            );
        }

        // Construir query base
        const query = this.apartadoRepo
            .createQueryBuilder('apartado')
            .leftJoinAndSelect('apartado.product', 'product')
            .leftJoinAndSelect('apartado.store', 'store')
            .leftJoinAndSelect('apartado.user', 'user')
            .where('apartado.user_id = :userId', { userId });

        // Filtrar si viene status
        if (status) {
            query.andWhere('apartado.status = :status', { status });
        }

        query.orderBy('apartado.created_at', 'DESC');

        const apartados = await query.getMany();

        return apartados;
    }

    async getApartadoById(userId: number, apartadoId: number) {
        const apartado = await this.apartadoRepo.findOne({
            where: { id: apartadoId },
            relations: ['user', 'store', 'product'],
        });

        if (!apartado) throw new NotFoundException('Apartado no encontrado');

        if (apartado.user.id !== userId) {
            throw new BadRequestException('No tienes permiso para ver este apartado');
        }

        return apartado;
    }


}
