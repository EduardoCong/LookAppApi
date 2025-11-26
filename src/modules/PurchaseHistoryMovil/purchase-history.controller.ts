import {
    Controller,
    Get,
    Query,
    Req,
    BadRequestException,
    Param,
} from '@nestjs/common';

import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';

import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

import { PurchaseHistoryService } from './purchase-history.service';
import { GetPurchaseHistoryDto } from './dto/get-history.dto';
import { PurchaseHistory } from './entities/purchase-history.entity';
import { PURCHASE_STATUSES } from './orders.constants';

@ApiTags('Historial de compras')
@ApiBearerAuth()
@Controller('purchases/history')
export class PurchaseHistoryController {
    private readonly jwtSecret: string;

    constructor(
        private readonly historyService: PurchaseHistoryService,
        private readonly configService: ConfigService,
    ) {
        this.jwtSecret = this.configService.get<string>('JWT_SECRET')!;
    }

    private extractUserId(req: any): number {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        if (!decoded.sub) throw new BadRequestException('Token inválido');

        return decoded.sub;
    }

    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener historial completo de compras del usuario',
        description: `
Retorna compras FULL + Apartados + Físicas.
Use query ?status=para filtrar por estatus.
        `,
    })
    @ApiQuery({
        name: 'status',
        required: false,
        description: 'Filtrar por estatus',
    })
    @ApiResponse({
        status: 200,
        type: [PurchaseHistory],
        description: 'Historial obtenido correctamente',
    })
    async getHistory(
        @Req() req,
        @Query() query: GetPurchaseHistoryDto,
    ) {
        const userId = this.extractUserId(req);
        return this.historyService.getAll(userId, query.status);
    }

    @Get('statuses')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener todos los estatus válidos de compras',
        description: `
Devuelve la lista de todos los estatus permitidos
para FULL, APARTADOS y FÍSICOS.
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Listado de estatus válidos obtenido correctamente'
    })
    getValidStatuses() {
        return {
            ok: true,
            statuses: PURCHASE_STATUSES,
        };
    }

    @Get(':type/:id')
    @ApiOperation({
        summary: 'Obtener detalle de un pedido según su tipo',
        description: `Tipos aceptados:
- full: compras pagadas completas
- apartado: compras apartadas
- fisico: compras físicas en tienda`
    })
    @ApiParam({ name: 'type', enum: ['full', 'apartado', 'fisico'] })
    @ApiParam({ name: 'id', type: Number })
    async getOrderByType(
        @Req() req,
        @Param('type') type: 'full' | 'apartado' | 'fisico',
        @Param('id') id: number,
    ) {
        const userId = this.extractUserId(req);
        return this.historyService.getOrderByType(userId, type, id);
    }

}
