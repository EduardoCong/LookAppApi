import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseApartado } from '../app/Purchases/entities/purchase-apartado.entity';
import { PurchaseFisico } from '../Cart/Entities/purchase-fisico.entity';


@Injectable()
export class PurchaseHistoryService {
    constructor(
        @InjectRepository(PurchaseFull)
        private readonly fullRepo: Repository<PurchaseFull>,

        @InjectRepository(PurchaseApartado)
        private readonly apartadoRepo: Repository<PurchaseApartado>,

        @InjectRepository(PurchaseFisico)
        private readonly fisicoRepo: Repository<PurchaseFisico>,
    ) { }

    async getAll(userId: number, status?: string) {
        const validStatuses = [
            'pendiente', 'pagado', 'cancelado',
            'apartado', 'liquidado', 'recogido',
            'vencido', 'recogido'
        ];

        if (status && !validStatuses.includes(status)) {
            throw new BadRequestException(
                `Estatus inválido. Usa uno de: ${validStatuses.join(', ')}`
            );
        }

        // FULL
        const full = await this.fullRepo.find({
            where: status
                ? { user: { id: userId }, status: status as any }
                : { user: { id: userId } },
            relations: ['product', 'store'],
            order: { created_at: 'DESC' },
        });

        // APARTADOS
        const apartados = await this.apartadoRepo.find({
            where: status
                ? { user: { id: userId }, status: status as any }
                : { user: { id: userId } },
            relations: ['product', 'store'],
            order: { created_at: 'DESC' },
        });

        // FISICO
        const fisicos = await this.fisicoRepo.find({
            where: status
                ? { user: { id: userId }, status: status as any }
                : { user: { id: userId } },
            relations: ['product', 'store'],
            order: { created_at: 'DESC' },
        });


        return [
            ...full.map(f => ({
                id: f.id,
                type: 'full',
                product: f.product.name,
                store: f.store.business_name,
                quantity: f.quantity,
                unit_price: f.unit_price,
                total_price: f.total_price,
                status: f.status,
                created_at: f.created_at,
            })),
            ...apartados.map(a => ({
                id: a.id,
                type: 'apartado',
                product: a.product.name,
                store: a.store.business_name,
                quantity: a.quantity,
                unit_price: a.unit_price,
                total_price: a.total_price,
                status: a.status,
                created_at: a.created_at,
            })),
            ...fisicos.map(p => ({
                id: p.id,
                type: 'fisico',
                product: p.product.name,
                store: p.store.business_name,
                quantity: p.quantity,
                unit_price: p.unit_price,
                total_price: p.total_price,
                status: p.status,
                created_at: p.created_at,
            })),
        ];
    }

    async getOrderByType(userId: number, type: string, id: number) {
        if (type === 'full') {
            const order = await this.fullRepo.findOne({
                where: { id, user: { id: userId } },
                relations: ['product', 'store']
            });
            if (!order) throw new NotFoundException('Pedido FULL no encontrado');
            return { type, data: order };
        }

        if (type === 'apartado') {
            const order = await this.apartadoRepo.findOne({
                where: { id, user: { id: userId } },
                relations: ['product', 'store']
            });
            if (!order) throw new NotFoundException('Apartado no encontrado');
            return { type, data: order };
        }

        if (type === 'fisico') {
            const order = await this.fisicoRepo.findOne({
                where: { id, user: { id: userId } },
                relations: ['product', 'store']
            });
            if (!order) throw new NotFoundException('Compra física no encontrada');
            return { type, data: order };
        }

        throw new BadRequestException('Tipo de pedido inválido');
    }

}
