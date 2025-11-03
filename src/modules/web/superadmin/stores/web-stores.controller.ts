import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { WebStoresService } from './web-stores.service';
import { RegisterStoreDto } from './dto/register-store.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Tiendas - Usuario - Stripe')
@Controller('web/stores')
export class WebStoresController {
    constructor(private readonly service: WebStoresService) { }

    @Public()
    @Post('create-account')
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

    @Get('admin/stats')
    async getStats() {
        return await this.service.getAdminStats();
    }
}
