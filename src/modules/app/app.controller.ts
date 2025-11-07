import {
    Controller,
    Get,
    Param,
    Req,
    BadRequestException,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AiHistoryService } from './History/history.service';
import type { Request } from 'express';
import { StoresService } from '../stores/stores.service';

@ApiTags('APP / Mobile')
@Controller('app')
export class AppController {
    private readonly jwtSecret: string;

    constructor(
        private readonly historyService: AiHistoryService,
        private readonly configService: ConfigService,

        private readonly storesService: StoresService
    ) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET not found');
        this.jwtSecret = secret;
    }

    @Get('history/mine')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Historial de búsquedas IA del usuario',
        description: `
Devuelve todas las búsquedas realizadas por el usuario autenticado 
(tanto texto como imágenes), incluyendo tipo, contenido y fecha.`,
    })
    async getMyHistory(@Req() req: Request) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;
        if (!userId)
            throw new BadRequestException('Token inválido: no contiene ID de usuario');

        const inputs = await this.historyService.getUserInputs(userId);
        return {
            ok: true,
            total: inputs.length,
            data: inputs,
        };
    }

    @Get('history/mine/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Detalle del resultado IA de una búsqueda',
        description: `
Devuelve el resultado generado por la IA (output) asociado a una búsqueda específica
del usuario autenticado, incluyendo el contenido original, la respuesta de la IA y la fecha.`,
    })
    async getMyHistoryDetail(@Req() req: Request, @Param('id') id: string) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;
        if (!userId)
            throw new BadRequestException('Token inválido: no contiene ID de usuario');

        const inputId = parseInt(id, 10);
        const detail = await this.historyService.getOutputsForInput(inputId, userId);
        return {
            ok: true,
            data: detail,
        };
    }


    @Get('store/:id')
    @ApiOperation({
        summary: 'Obtener información pública de una tienda',
        description: `
Devuelve los datos de una tienda visible en la app (nombre comercial, dirección, descripción, categoría, productos y detalles si existen).  
Este endpoint es **público**, no requiere autenticación.`,
    })
    @ApiParam({
        name: 'id',
        type: Number,
        example: 7,
        description: 'ID de la tienda que se desea consultar',
    })
    async getStoreById(@Param('id', ParseIntPipe) id: number) {
        try {
            const store = await this.storesService.findOne(id);

            return {
                ok: true,
                data: {
                    id: store.id,
                    business_name: store.business_name,
                    owner_name: store.owner_name,
                    address: store.address,
                    description: store.description,
                    is_verified: store.is_verified,
                    category: store.category?.name ?? null,
                    status: store.status,
                    detail: store.detail ?? null,
                },
            };
        } catch (error) {
            throw new NotFoundException('Tienda no encontrada o inactiva');
        }
    }
}
