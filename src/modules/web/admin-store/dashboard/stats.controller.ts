import { Body, Controller, Get, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { StoreStatsService } from './stats.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { WebStoresService } from '../../superadmin/stores/web-stores.service';
import { RegisterStoreDto } from '../../superadmin/stores/dto/register-store.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('web/stores')
@ApiTags('WEB / Admin Store')
export class StoreStatsController {
    private readonly jwtSecret: string;

    constructor(
        private readonly statsService: StoreStatsService,
        private readonly configService: ConfigService,
        private readonly service: WebStoresService
    ) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        this.jwtSecret = secret;
    }


    @Public()
    @Post('create-account')
    @ApiOperation({
        summary: 'Registrar tienda con plan y método de pago',
        description: `Crea una nueva cuenta de tienda junto con su suscripción inicial.  
  Este endpoint recibe los datos de registro de la tienda y el plan de suscripción seleccionado.  
  Se valida que existan los campos obligatorios **plan_id** y **payment_method_id**, 
  y luego se comunica con Stripe para crear el registro completo.`,
    })
    @ApiBody({ type: RegisterStoreDto })
    async register(@Body() body: RegisterStoreDto) {
        const { plan_id, payment_method_id } = body;

        if (!plan_id || !payment_method_id) {
            throw new HttpException(
                'Faltan campos obligatorios: plan_id o payment_method_id',
                HttpStatus.BAD_REQUEST,
            );
        }

        return this.service.registerWithStripe(body);
    }

    @ApiBearerAuth()
    @Get('mine/stats')
    @ApiOperation({
        summary: 'Estadísticas generales de la tienda',
        description: 'Devuelve datos agregados sobre ventas, productos y actividad de la tienda.'
    })
    async myStoreStats(@Req() req: Request) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return {
                    ok: false,
                    error: 'No authorization header provided',
                };
            }

            const token = authHeader.replace('Bearer ', '').trim();
            if (!token) {
                return {
                    ok: false,
                    error: 'Invalid token format',
                };
            }

            const decoded: any = jwt.verify(token, this.jwtSecret);
            console.log('Decoded token:', decoded);

            const storeId =
                decoded.storeId ??
                decoded.defaultStoreId ??
                decoded.user?.store?.id ??
                decoded.stores?.[0]?.id;

            if (!storeId) {
                return {
                    ok: false,
                    error: 'No store linked to user',
                };
            }

            const stats = await this.statsService.getStatsForStore(storeId);

            return {
                ok: true,
                data: stats,
            };
        } catch (err: any) {
            console.error('Error decoding token or fetching stats:', err.message);
            return {
                ok: false,
                error: 'Unauthorized or invalid token',
            };
        }
    }


    @ApiBearerAuth()
    @Get('mine/products')
    @ApiOperation({
        summary: 'Listado de productos del usuario',
        description: 'Obtiene todos los productos asociados a la tienda actual.'
    })
    async myStoreProducts(@Req() req: Request) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return {
                    ok: false,
                    error: 'No authorization header provided',
                };
            }

            const token = authHeader.replace('Bearer ', '').trim();
            if (!token) {
                return {
                    ok: false,
                    error: 'Invalid token format',
                };
            }

            const decoded: any = jwt.verify(token, this.jwtSecret);
            console.log('Decoded token for products:', decoded);

            const products = await this.statsService.getProductsByRole(decoded);

            return {
                ok: true,
                total: products.length,
                data: products,
            };
        } catch (err: any) {
            console.error('Error decoding token or fetching products:', err.message);
            return {
                ok: false,
                error: 'Unauthorized or invalid token',
            };
        }
    }

    @ApiBearerAuth()
    @Get('mine/subscription')
    @ApiOperation({
        summary: 'Información de la suscripción actual',
        description: 'Retorna el plan de suscripción activo de la tienda, fecha de expiración, etc.'
    })
    async myStoreSubscription(@Req() req: Request) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return {
                    ok: false,
                    error: 'No authorization header provided',
                };
            }

            const token = authHeader.replace('Bearer ', '').trim();
            if (!token) {
                return {
                    ok: false,
                    error: 'Invalid token format',
                };
            }

            const decoded: any = jwt.verify(token, this.jwtSecret);
            console.log('Decoded token for subscription:', decoded);

            const storeId =
                decoded.storeId ??
                decoded.defaultStoreId ??
                decoded.user?.store?.id ??
                decoded.stores?.[0]?.id;

            if (!storeId)
                return { ok: false, error: 'No store linked to user' };

            const subscription = await this.statsService.getSubscriptionDetail(storeId);

            return { ok: true, data: subscription };
        } catch (err: any) {
            console.error('Error decoding token or fetching subscription:', err.message);
            return { ok: false, error: 'Unauthorized or invalid token' };
        }
    }


    @ApiBearerAuth()
    @Get('mine/profile-with-store')
    @ApiOperation({
        summary: 'Perfil del usuario con su tienda',
        description: 'Combina los datos del usuario y los detalles de la tienda en un solo objeto.'
    })
    async myProfileWithMyStore(@Req() req: Request) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return {
                    ok: false,
                    error: 'No authorization header provided',
                };
            }

            const token = authHeader.replace('Bearer ', '').trim();
            if (!token) {
                return {
                    ok: false,
                    error: 'Invalid token format',
                };
            }

            const decoded: any = jwt.verify(token, this.jwtSecret);
            console.log('Decoded token for subscription:', decoded);



            const userId = decoded.sub;
            if (!userId) {
                return { ok: false, error: 'No se pudo obtener el ID del usuario.' };
            }


            const data = await this.statsService.getProfileWithStore(userId);

            return { ok: true, data };
        } catch (err: any) {
            console.error('Error decoding token or fetching subscription:', err.message);
            return { ok: false, error: 'Unauthorized or invalid token' };
        }
    }
}
