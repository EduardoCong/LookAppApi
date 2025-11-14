import {
    Controller,
    Get,
    Param,
    Req,
    BadRequestException,
    ParseIntPipe,
    NotFoundException,
    Post,
    Body,
    Patch,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AiHistoryService } from './History/history.service';
import type { Request } from 'express';
import { StoresService } from '../stores/stores.service';
import { PurchasesFullService } from './Purchases/purchases-full.service';
import { PurchaseApartadoService } from './Purchases/purchase-apartado.service';

@ApiTags('APP / Mobile')
@Controller('app')
export class AppController {
    private readonly jwtSecret: string;

    constructor(
        private readonly historyService: AiHistoryService,
        private readonly configService: ConfigService,

        private readonly storesService: StoresService,
        private readonly purchasesFullService: PurchasesFullService,
        private readonly purchaseApartadoService: PurchaseApartadoService,
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

    @Post('purchase')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Registrar compra con pago completo',
        description: `
Registra una compra 100% pagada por el usuario autenticado.  
El backend valida el pago con Stripe, descuenta el stock y deja la compra en estado **pendiente de recogida**.`,
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['store_id', 'product_id', 'quantity', 'payment_method_id'],
            properties: {
                store_id: {
                    type: 'number',
                    example: 3,
                    description: 'ID de la tienda donde se realiza la compra.',
                },
                product_id: {
                    type: 'number',
                    example: 17,
                    description: 'ID del producto que se va a comprar.',
                },
                quantity: {
                    type: 'number',
                    example: 2,
                    description: 'Cantidad de unidades del producto.',
                },
                payment_method_id: {
                    type: 'string',
                    example: 'pm_card_visa',
                    description:
                        'ID del método de pago generado por Stripe (puede usarse `pm_card_visa` en modo de prueba).',
                },
            },
        },
    })
    async createPurchase(
        @Req() req: Request,
        @Body()
        body: {
            store_id: number;
            product_id: number;
            quantity: number;
            payment_method_id: string;
        },
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;
        if (!userId)
            throw new BadRequestException('Token inválido: no contiene ID de usuario');

        const { store_id, product_id, quantity, payment_method_id } = body;
        if (!store_id || !product_id || !quantity || !payment_method_id)
            throw new BadRequestException(
                'Faltan datos obligatorios: store_id, product_id, quantity o payment_method_id',
            );

        const result = await this.purchasesFullService.createPurchase(
            userId,
            store_id,
            product_id,
            quantity,
            payment_method_id,
        );

        return result;
    }

    @Post('purchase/apartado')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Registrar compra por apartado',
        description: `
Cobra solo el **anticipo** según el porcentaje indicado, descuenta stock
y registra la operación como "apartado".`,
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['store_id', 'product_id', 'quantity', 'porcentaje', 'payment_method_id'],
            properties: {
                store_id: {
                    type: 'number',
                    example: 3,
                    description: 'ID de la tienda donde se realiza el apartado.',
                },
                product_id: {
                    type: 'number',
                    example: 17,
                    description: 'ID del producto que se va a apartar.',
                },
                quantity: {
                    type: 'number',
                    example: 1,
                    description: 'Cantidad del producto a apartar.',
                },
                porcentaje: {
                    type: 'number',
                    example: 30,
                    description: 'Porcentaje de anticipo que el cliente pagará.',
                },
                payment_method_id: {
                    type: 'string',
                    example: 'pm_card_visa',
                    description: 'ID del método de pago de Stripe.',
                },
            },
        },
    })
    async createApartado(
        @Req() req: Request,
        @Body()
        body: {
            store_id: number;
            product_id: number;
            quantity: number;
            porcentaje: number;
            payment_method_id: string;
        },
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;
        if (!userId)
            throw new BadRequestException('Token inválido: no contiene ID de usuario');

        const { store_id, product_id, quantity, porcentaje, payment_method_id } = body;

        if (!store_id || !product_id || !quantity || !porcentaje || !payment_method_id) {
            throw new BadRequestException(
                'Faltan datos obligatorios: store_id, product_id, quantity, porcentaje o payment_method_id',
            );
        }

        const result = await this.purchaseApartadoService.createApartado(
            userId,
            store_id,
            product_id,
            quantity,
            porcentaje,
            payment_method_id,
        );

        return result;
    }

    @Post('purchase/apartado/pagar')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Realizar un pago parcial o liquidar un apartado',
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['apartado_id', 'monto', 'payment_method_id'],
            properties: {
                apartado_id: { type: 'number', example: 12 },
                monto: { type: 'number', example: 250 },
                payment_method_id: { type: 'string', example: 'pm_card_visa' },
            },
        },
    })
    async pagarApartado(
        @Req() req: Request,
        @Body() body: { apartado_id: number; monto: number; payment_method_id: string }
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;

        return this.purchaseApartadoService.pagarApartado(
            userId,
            body.apartado_id,
            body.monto,
            body.payment_method_id,
        );
    }

    @Get('purchase/full')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener compras completas del usuario',
        description:
            'Puedes filtrar por estatus: pendiente o recogido. Si no envías estatus, devuelve todas.'
    })
    async getFullPurchases(
        @Req() req: Request,
        @Query('status') status?: string,
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;

        if (!userId)
            throw new BadRequestException('Token inválido: no contiene ID de usuario');

        const data = await this.purchasesFullService.getPurchasesByStatus(
            userId,
            status
        );

        return {
            ok: true,
            total: data.length,
            data,
        };
    }

    @Get('apartados/mine')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener apartados del usuario',
        description:
            'Puedes filtrar por estatus: apartado, liquidado o recogido. Si no envías estatus, devuelve todos los apartados del usuario.',
    })
    async getMyApartados(
        @Req() req: Request,
        @Query('status') status?: 'apartado' | 'liquidado' | 'recogido'
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;

        if (!userId) {
            throw new BadRequestException('Token inválido: no contiene ID de usuario');
        }

        const data = await this.purchaseApartadoService.getApartadosByStatus(
            userId,
            status
        );

        return {
            ok: true,
            total: data.length,
            data,
        };
    }

    @Get('apartados/mine/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener detalle de un apartado',
        description: 'Devuelve la información de un apartado específico del usuario.',
    })
    async getApartadoDetail(
        @Req() req: Request,
        @Param('id') id: number
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;

        const data = await this.purchaseApartadoService.getApartadoById(
            userId,
            Number(id)
        );

        return { ok: true, data };
    }

    @Get('purchase/mine/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obtener detalle de una compra completa',
        description:
            'Devuelve los datos de una compra pagada al 100% perteneciente al usuario autenticado.',
    })
    async getPurchaseDetail(
        @Req() req: Request,
        @Param('id') id: number
    ) {
        const token = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!token) throw new BadRequestException('Token requerido');

        const decoded: any = jwt.verify(token, this.jwtSecret);
        const userId = decoded.sub;

        const data = await this.purchasesFullService.getPurchaseById(
            userId,
            Number(id)
        );

        return { ok: true, data };
    }



}
