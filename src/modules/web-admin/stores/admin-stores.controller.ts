import { Controller, Get, Param, Patch, Body, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { AdminStoresService } from './admin-stores.service';

@Controller('stores')
export class AdminStoresController {
    constructor(private readonly service: AdminStoresService) { }

    @Get('pending')
    async getPending() {
        const data = await this.service.findPending();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas pendientes obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Get('approved')
    async getApproved() {
        const data = await this.service.findApproved();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas aprobadas obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Get('rejected')
    async getRejected() {
        const data = await this.service.findRejected();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas rechazadas obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Get(':id')
    async getOne(@Param('id', ParseIntPipe) id: number) {
        const store = await this.service.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} obtenida correctamente`,
            data: store,
        };
    }

    @Patch(':id/approve')
    async approve(@Param('id', ParseIntPipe) id: number) {
        const result = await this.service.approve(id, 1);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            data: result.store,
        };
    }

    @Patch(':id/reject')
    async reject(
        @Param('id', ParseIntPipe) id: number,
        @Body('comment') comment: string,
    ) {
        const result = await this.service.reject(id, 1, comment);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            data: result.store,
        };
    }
}
