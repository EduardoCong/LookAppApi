import { Body, Controller, Get, HttpException, HttpStatus, Patch, Post, Query, Req } from '@nestjs/common';
import { StoreStatsService } from './stats.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { WebStoresService } from '../../superadmin/stores/web-stores.service';
import { RegisterStoreDto } from '../../superadmin/stores/dto/register-store.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { StoreReportsService } from '../reports/store-reports.service';

@Controller('web/stores')
@ApiTags('WEB / Admin Store')
export class StoreStatsController {
    private readonly jwtSecret: string;

    constructor(
        private readonly statsService: StoreStatsService,
        private readonly configService: ConfigService,
        private readonly service: WebStoresService,
        private readonly reportsService: StoreReportsService
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

    @ApiBearerAuth()
    @Patch('mine/profile-with-store')
    @ApiOperation({
        summary: 'Actualizar perfil del usuario y su tienda',
        description: `Permite modificar los datos del usuario autenticado (nombre, teléfono, etc.) 
    y los datos de su tienda (nombre comercial, dirección, descripción, contacto, horarios, etc.).`,
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userData: {
                    type: 'object',
                    description: 'Datos del usuario autenticado',
                    properties: {
                        name: { type: 'string', example: 'Carlos Pérez' },
                        email: { type: 'string', example: 'carlos.perez@example.com' },
                        phone: { type: 'string', example: '9991234567' },
                        username: { type: 'string', example: 'carlitospz' },
                        password: { type: 'string', example: 'NuevaContraseña123*' },
                    },
                },
                storeData: {
                    type: 'object',
                    description: 'Datos principales de la tienda vinculada al usuario',
                    properties: {
                        business_name: { type: 'string', example: 'Ferretería El Clavo Feliz' },
                        owner_name: { type: 'string', example: 'Carlos Pérez' },
                        address: { type: 'string', example: 'Av. Reforma #123, Mérida, Yucatán' },
                        map_url: { type: 'string', example: 'https://goo.gl/maps/ferreteria-clavo' },
                        description: { type: 'string', example: 'Venta de herramientas y materiales para construcción.' },
                        is_verified: { type: 'boolean', example: true },
                        category_id: { type: 'integer', example: 3 },
                        longitude: { type: 'string', example: '-89.612345' },
                        latitude: { type: 'string', example: '20.967123' },
                        status: { type: 'string', example: 'active' },
                    },
                },
                detailData: {
                    type: 'object',
                    description: 'Detalles extendidos de la tienda (tabla store_details)',
                    properties: {
                        description: { type: 'string', example: 'Sucursal principal con atención de lunes a sábado.' },
                        rfc: { type: 'string', example: 'PECA800101AB1' },
                        phone: { type: 'string', example: '9997654321' },
                        email_contact: { type: 'string', example: 'contacto@clavofeliz.mx' },
                        logo_url: { type: 'string', example: 'https://cdn.hub-titan.com/logos/ferreteria.png' },
                        cover_image_url: { type: 'string', example: 'https://cdn.hub-titan.com/covers/portada.jpg' },
                        opening_hours: {
                            type: 'object',
                            example: {
                                monday: '09:00-18:00',
                                tuesday: '09:00-18:00',
                                saturday: '10:00-14:00',
                                sunday: 'Cerrado',
                            },
                        },
                        reference: { type: 'string', example: 'Frente al parque principal' },
                        contact_method: { type: 'string', example: 'Teléfono y WhatsApp' },
                        social_links: {
                            type: 'object',
                            example: {
                                facebook: 'https://facebook.com/elclavofeliz',
                                instagram: 'https://instagram.com/elclavofeliz',
                            },
                        },
                    },
                },
            },
        },
    })
    async updateProfileWithMyStore(@Req() req: Request, @Body() body: any) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '').trim();
            if (!token) return { ok: false, error: 'Invalid token format' };

            const decoded: any = jwt.verify(token, this.jwtSecret);
            const userId = decoded.sub;

            if (!userId) return { ok: false, error: 'No se pudo obtener el ID del usuario.' };

            await this.statsService.updateProfileWithStore(userId, body);

            return {
                ok: true,
                message: 'Perfil y tienda actualizados correctamente',
            };
        } catch (err: any) {
            console.error('Error updating profile and store:', err.message);
            return {
                ok: false,
                error: 'No se pudo actualizar la información del perfil o tienda',
            };
        }
    }

    // --- Reportes de Tienda (Ventas, Inventario, Desempeño) ---

    @ApiBearerAuth()
    @Get('mine/reports/sales')
    @ApiOperation({
        summary: 'Reporte de ventas por rango de fechas',
        description:
            'Devuelve el total de ventas, unidades, ticket promedio y los productos más vendidos dentro del rango solicitado.',
    })
    async getSalesReport(
        @Req() req: Request,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new HttpException('No authorization header provided', HttpStatus.UNAUTHORIZED);
            }

            const token = authHeader.replace('Bearer ', '').trim();
            const decoded: any = jwt.verify(token, this.jwtSecret);

            const storeId =
                decoded.storeId ??
                decoded.defaultStoreId ??
                decoded.user?.store?.id ??
                decoded.stores?.[0]?.id;

            if (!storeId) {
                throw new HttpException('No store linked to user', HttpStatus.BAD_REQUEST);
            }

            const data = await this.reportsService.getSalesReport(storeId, from, to);
            return { ok: true, data };
        } catch (err: any) {
            console.error('Error in getSalesReport:', err.message);
            throw new HttpException('Unauthorized or invalid token', HttpStatus.UNAUTHORIZED);
        }
    }

    @ApiBearerAuth()
    @Get('mine/reports/inventory')
    @ApiOperation({
        summary: 'Reporte de inventario actual de la tienda',
        description:
            'Devuelve el stock actual de productos, conteos totales, unidades bajas, y costo unitario promedio.',
    })
    async getInventoryReport(@Req() req: Request) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new HttpException('No authorization header provided', HttpStatus.UNAUTHORIZED);
            }

            const token = authHeader.replace('Bearer ', '').trim();
            const decoded: any = jwt.verify(token, this.jwtSecret);

            const storeId =
                decoded.storeId ??
                decoded.defaultStoreId ??
                decoded.user?.store?.id ??
                decoded.stores?.[0]?.id;

            if (!storeId) {
                throw new HttpException('No store linked to user', HttpStatus.BAD_REQUEST);
            }

            const data = await this.reportsService.getInventoryReport(storeId);
            return { ok: true, data };
        } catch (err: any) {
            console.error('Error in getInventoryReport:', err.message);
            throw new HttpException('Unauthorized or invalid token', HttpStatus.UNAUTHORIZED);
        }
    }

    @ApiBearerAuth()
    @Get('mine/reports/daily')
    @ApiOperation({
        summary: 'Reporte de desempeño diario de ventas',
        description:
            'Agrupa las ventas por día, mostrando totales, ticket promedio y número de operaciones por fecha.',
    })
    async getDailyReport(
        @Req() req: Request,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new HttpException('No authorization header provided', HttpStatus.UNAUTHORIZED);
            }

            const token = authHeader.replace('Bearer ', '').trim();
            const decoded: any = jwt.verify(token, this.jwtSecret);

            const storeId =
                decoded.storeId ??
                decoded.defaultStoreId ??
                decoded.user?.store?.id ??
                decoded.stores?.[0]?.id;

            if (!storeId) {
                throw new HttpException('No store linked to user', HttpStatus.BAD_REQUEST);
            }

            const data = await this.reportsService.getDailyPerformance(storeId, from, to);
            return { ok: true, data };
        } catch (err: any) {
            console.error('Error in getDailyReport:', err.message);
            throw new HttpException('Unauthorized or invalid token', HttpStatus.UNAUTHORIZED);
        }
    }

}

