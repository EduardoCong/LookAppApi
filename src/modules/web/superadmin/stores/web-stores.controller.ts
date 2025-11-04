import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { WebStoresService } from './web-stores.service';
import { RegisterStoreDto } from './dto/register-store.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('WEB / SuperAdmin')
@Controller('web/superadmin')
export class WebStoresController {
    constructor(private readonly service: WebStoresService) { }


    @Get('admin/stats')
    async getStats() {
        return await this.service.getAdminStats();
    }
}
