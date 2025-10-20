import { Controller, Post, Body, Get } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('stores')
export class StoresController {
    constructor(private readonly service: StoresService) { }

    @Post()
    @ApiBody({ type: CreateStoreDto })
    create(@Body() dto: CreateStoreDto) {
        return this.service.create(dto);
    }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get('with-users-categories')
    findAll() {
        return this.service.findAll();
    }
}
