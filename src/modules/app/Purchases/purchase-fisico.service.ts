import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/modules/users/entities/user.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { PurchaseFisico } from 'src/modules/Cart/Entities/purchase-fisico.entity';

@Injectable()
export class PurchaseFisicoService {
    constructor(
        @InjectRepository(PurchaseFisico)
        private readonly fisicoRepo: Repository<PurchaseFisico>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) { }

    // ===========================================
    // OBTENER COMPRAS FÍSICAS POR ESTATUS
    // ===========================================
    async getFisicosByStatus(
        userId: number,
        status?: 'pendiente' | 'recogido' | 'vencido',
    ) {
        const validStatuses = ['pendiente', 'recogido', 'vencido'];

        if (status && !validStatuses.includes(status)) {
            throw new BadRequestException(
                `El estatus debe ser uno de: ${validStatuses.join(', ')}`,
            );
        }

        const query = this.fisicoRepo
            .createQueryBuilder('fisico')
            .leftJoinAndSelect('fisico.product', 'product')
            .leftJoinAndSelect('fisico.store', 'store')
            .leftJoinAndSelect('fisico.user', 'user')
            .where('fisico.user_id = :userId', { userId });

        if (status) {
            query.andWhere('fisico.status = :status', { status });
        }

        query.orderBy('fisico.created_at', 'DESC');

        const fisicos = await query.getMany();
        return fisicos;
    }

    // ===========================================
    // OBTENER UNA COMPRA POR ID
    // ===========================================
    async getFisicoById(userId: number, fisicoId: number) {
        const fisico = await this.fisicoRepo.findOne({
            where: { id: fisicoId },
            relations: ['user', 'store', 'product'],
        });

        if (!fisico) throw new NotFoundException('Compra física no encontrada');

        if (fisico.user.id !== userId) {
            throw new BadRequestException('No tienes permiso para ver esta compra');
        }

        return fisico;
    }

    // ===========================================
    // MARCAR COMO RECOGIDO
    // ===========================================
    async marcarComoRecogido(userId: number, fisicoId: number) {
        const fisico = await this.fisicoRepo.findOne({
            where: { id: fisicoId },
            relations: ['user', 'store', 'product'],
        });

        if (!fisico) {
            throw new NotFoundException('Compra física no encontrada');
        }

        if (fisico.user.id !== userId) {
            throw new BadRequestException('Esta compra no pertenece al usuario');
        }

        if (fisico.status === 'recogido') {
            throw new BadRequestException('Esta compra ya fue marcada como recogida');
        }

        // Validar que no haya expirado
        const now = new Date();
        if (fisico.expires_at < now) {
            fisico.status = 'vencido';
            await this.fisicoRepo.save(fisico);

            throw new BadRequestException(
                'Esta compra ya expiró y no puede ser marcada como recogida',
            );
        }

        fisico.status = 'recogido';
        await this.fisicoRepo.save(fisico);

        return {
            ok: true,
            message: 'Compra marcada como recogida correctamente',
            data: {
                id: fisico.id,
                product: fisico.product.name,
                store: fisico.store.business_name,
                status: fisico.status,
                pickup_date: fisico.updated_at,
            },
        };
    }
}
