import { Controller, Post, Body, Get, HttpStatus, Param, Put, Delete } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/create-store.dto';
import { ApiBody, ApiParam } from '@nestjs/swagger';

@Controller('stores')
export class StoresController {
    constructor(private readonly service: StoresService) { }

    @Post()
    @ApiBody({ type: CreateStoreDto })
    async create(@Body() dto: CreateStoreDto) {
        const store = await this.service.create(dto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Tienda creada correctamente',
            data: store,
        };
    }

    @Get()
    async getAll() {
        const stores = await this.service.getAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado básico de tiendas obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }

    @Get('with-users-categories')
    async findAll() {
        const stores = await this.service.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas con usuarios y categorías obtenido correctamente',
            total: stores.length,
            data: stores,
        };
    }

    @Get('with-products')
    async getStoreWithProducts() {
        const stores = await this.service.getStorewithProducts();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas con productos obtenido correctamente',
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

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda a eliminar' })
    async remove(@Param('id') id: number) {
        await this.service.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} eliminada correctamente`,
        };
    }
}
