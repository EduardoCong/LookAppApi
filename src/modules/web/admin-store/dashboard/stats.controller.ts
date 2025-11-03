import { Controller, Get, Req } from '@nestjs/common';
import { StoreStatsService } from './stats.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Controller('web/stores')
export class StoreStatsController {
    private readonly jwtSecret: string;

    constructor(
        private readonly statsService: StoreStatsService,
        private readonly configService: ConfigService,
    ) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        this.jwtSecret = secret;
    }

    @ApiBearerAuth()
    @ApiTags('Dashboard - Admin Tienda')
    @Get('mine/stats')
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
    @ApiTags('Dashboard - Productos')
    @Get('mine/products')
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
}
