import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Req,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';

import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PayCartDto } from './dto/pay-cart.dto';

@ApiTags('Carrito')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
    private readonly jwtSecret: string;

    constructor(
        private readonly cartService: CartService,
        private readonly configService: ConfigService,
    ) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET no está definido en el archivo .env');
        this.jwtSecret = secret;
    }

    // Helper para extraer userId del token
    private extractUserId(req: any): number {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            throw new HttpException('No authorization header provided', HttpStatus.UNAUTHORIZED);

        const token = authHeader.replace('Bearer ', '').trim();
        if (!token)
            throw new HttpException('Invalid token format', HttpStatus.UNAUTHORIZED);

        const decoded: any = jwt.verify(token, this.jwtSecret);

        const userId = decoded.sub;
        if (!userId)
            throw new HttpException(
                'No se pudo obtener el ID del usuario del token',
                HttpStatus.UNAUTHORIZED,
            );

        return userId;
    }


    @Post('add')
    @ApiOperation({ summary: 'Agregar un producto al carrito' })
    @ApiBody({
        type: AddToCartDto,
        examples: {
            ejemplo: {
                summary: 'Agregar producto al carrito',
                value: {
                    productId: 15,
                    quantity: 2,
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Producto agregado correctamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos o producto no encontrado' })
    async addToCart(@Req() req, @Body() dto: AddToCartDto) {
        const userId = this.extractUserId(req);
        return this.cartService.addToCart(userId, dto.productId, dto.quantity);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener el carrito del usuario (agrupado por tienda)' })
    @ApiResponse({
        status: 200,
        description: 'Carrito obtenido correctamente',
    })
    async getCart(@Req() req) {
        const userId = this.extractUserId(req);
        return this.cartService.getCart(userId);
    }


    @Patch('update/:productId')
    @ApiOperation({ summary: 'Actualizar cantidad de un producto en el carrito' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiBody({
        type: UpdateCartDto,
        examples: {
            ejemplo: {
                summary: 'Actualizar cantidad',
                value: {
                    quantity: 5,
                },
            },
        },
    })
    async updateQuantity(
        @Req() req,
        @Param('productId') productId: number,
        @Body() dto: UpdateCartDto,
    ) {
        const userId = this.extractUserId(req);
        return this.cartService.updateQuantity(userId, Number(productId), dto.quantity);
    }

    @Delete('remove/:productId')
    @ApiOperation({ summary: 'Eliminar un producto del carrito' })
    @ApiParam({ name: 'productId', type: Number })
    @ApiResponse({ status: 200, description: 'Producto eliminado del carrito' })
    async removeFromCart(@Req() req, @Param('productId') productId: number) {
        const userId = this.extractUserId(req);
        return this.cartService.removeFromCart(userId, Number(productId));
    }

    @Delete('clear')
    @ApiOperation({ summary: 'Vaciar el carrito completo del usuario' })
    @ApiResponse({ status: 200, description: 'Carrito vaciado correctamente' })
    async clearCart(@Req() req) {
        const userId = this.extractUserId(req);
        return this.cartService.clearCart(userId);
    }


    @Post('pay')
    @ApiOperation({
        summary: 'Pagar carrito completo (multi–tienda)',
        description: `
Realiza un pago por tienda, descuenta stock y genera las compras.
Cada tienda genera un PaymentIntent independiente.`,
    })
    @ApiBody({
        type: PayCartDto,
        examples: {
            ejemplo: {
                summary: 'Pagar carrito',
                value: {
                    paymentMethodId: 'pm_1Qw21pKkEf8XyZ',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Carrito pagado correctamente' })
    @ApiResponse({ status: 400, description: 'Error en stock o en Stripe' })
    async payCart(@Req() req, @Body() dto: PayCartDto) {
        const userId = this.extractUserId(req);
        return this.cartService.payCart(userId, dto.paymentMethodId);
    }

    @Post('pay/store/:storeId')
    @ApiOperation({
        summary: 'Pagar carrito SOLO de una tienda',
        description: `
Cuando el usuario está dentro del modo tienda:
- Solo compra productos de esa tienda.
- Un solo PaymentIntent.
- Valida stock.
- Registra compras.
- Limpia SOLO los items de esa tienda.`,
    })
    @ApiParam({ name: 'storeId', type: Number })
    @ApiBody({
        type: PayCartDto,
        examples: {
            ejemplo: {
                summary: 'Pago dentro de una tienda',
                value: {
                    paymentMethodId: 'pm_1Qw21pKkEf8XyZ',
                },
            },
        },
    })
    async payCartForStore(
        @Req() req,
        @Param('storeId') storeId: number,
        @Body() dto: PayCartDto,
    ) {
        const userId = this.extractUserId(req);
        return this.cartService.payCartForStore(userId, Number(storeId), dto.paymentMethodId);
    }

    @Post('pay/physical')
    @ApiOperation({
        summary: 'Registrar compra física del carrito completo (multi–tienda)',
        description: `
Registra compras físicas (sin Stripe), descuenta stock, guarda un registro por tienda
y asigna 72 horas para recogerlo.`
    })
    @ApiResponse({ status: 201, description: 'Compra física registrada correctamente' })
    async payCartFisico(@Req() req) {
        const userId = this.extractUserId(req);
        return this.cartService.payCartFisico(userId);
    }


    @Post('pay/physical/store/:storeId')
    @ApiOperation({
        summary: 'Registrar compra física SOLO de una tienda',
        description: `
Cuando el usuario compra dentro del modo tienda:
- Solo procesa productos de esa tienda
- Descuenta stock
- Crea registros físicos (72 horas para recoger)
- No toca productos de otras tiendas`
    })
    @ApiParam({ name: 'storeId', type: Number })
    @ApiResponse({ status: 201, description: 'Compra física de tienda registrada correctamente' })
    async payCartFisicoStore(
        @Req() req,
        @Param('storeId') storeId: number,
    ) {
        const userId = this.extractUserId(req);
        return this.cartService.payCartFisicoStore(userId, Number(storeId));
    }

    @Post('pay/physical/single')
    @ApiOperation({
        summary: 'Registrar compra física individual (sin carrito)',
        description: `
Para compras rápidas en tienda física.
Requiere productId y quantity.`
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                productId: { type: 'number' },
                quantity: { type: 'number', default: 1 }
            }
        },
        examples: {
            ejemplo: {
                summary: 'Compra física individual',
                value: {
                    productId: 45,
                    quantity: 2
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Compra física individual registrada' })
    async paySingleFisico(
        @Req() req,
        @Body() body: { productId: number, quantity: number }
    ) {
        const userId = this.extractUserId(req);
        return this.cartService.payFisicoIndividual(
            userId,
            body.productId,
            body.quantity,
        );
    }

}
