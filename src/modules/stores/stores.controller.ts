import {
    Controller,
    Post,
    Body,
    Get,
    HttpStatus,
    Param,
    Put,
    Delete,
    Patch,
    Req,
} from '@nestjs/common';

import { ApiBody, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/create-store.dto';
import { StoreStatus } from './entities/store.entity';
import { UpdateStoreDetailDto } from './dto/store-detail.dto';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('web/stores')
export class StoresWebController {
    constructor(private readonly service: StoresService) { }


    @Post('register')
    @ApiBody({ type: CreateStoreDto })
    async create(@Body() dto: CreateStoreDto) {
        const store = await this.service.create(dto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Tienda registrada correctamente',
            data: store,
        };
    }

    @Get()
    async findAll() {
        const stores = await this.service.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado completo de tiendas obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }


    @Get('pending')
    async findPending() {
        const stores = await this.service.findPending();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas pendientes obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }


    @Get('rejected')
    async findRejected() {
        const stores = await this.service.findRejected();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas rechazadas obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }


    @Get('active')
    async findActive() {
        const stores = await this.service.findActive();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas activas obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }


    @Get(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda' })
    async findOne(@Param('id') id: number) {
        const store = await this.service.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} obtenida correctamente`,
            data: store,
        };
    }


    @Get('mine/profile')
    async getMine(@Req() req) {
        const userId = req.user.sub;
        const store = await this.service.findByUser(userId);
        return {
            statusCode: HttpStatus.OK,
            message: 'Perfil de tienda obtenido correctamente',
            data: store,
        };
    }


    @Put(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda a actualizar' })
    @ApiBody({ type: UpdateStoreDto })
    async update(@Param('id') id: number, @Body() dto: UpdateStoreDto) {
        const updated = await this.service.update(id, dto);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} actualizada correctamente`,
            data: updated,
        };
    }


    @Patch(':id/status')
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: { status: { type: 'string', enum: ['pending', 'active', 'rejected'] } },
        },
    })
    async changeStatus(
        @Param('id') id: number,
        @Body('status') status: StoreStatus,
    ) {
        const updated = await this.service.changeStatus(id, status);
        return {
            statusCode: HttpStatus.OK,
            message: `Estatus de tienda con ID ${id} actualizado a '${status}' correctamente`,
            data: updated,
        };
    }


    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda a eliminar' })
    async remove(@Param('id') id: number) {
        await this.service.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} eliminada correctamente`,
        };
    }

    @Put(':id/detail')
    @ApiBody({ type: UpdateStoreDetailDto })
    async updateDetail(
        @Param('id') id: number,
        @Body() dto: UpdateStoreDetailDto,
    ) {
        const detail = await this.service.updateDetail(id, dto);
        return {
            statusCode: HttpStatus.OK,
            message: `Detalle de la tienda ${id} actualizado correctamente`,
            data: detail,
        };
    }

    @Get(':id/detail')
    async getDetail(@Param('id') id: number) {
        const detail = await this.service.getDetail(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Detalle de la tienda ${id} obtenido correctamente`,
            data: detail,
        };
    }

}
