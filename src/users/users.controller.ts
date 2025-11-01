import { Controller, Post, Body, Get, Param, Put, Delete, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) { }

    @Post()
    @ApiBody({ type: CreateUserDto })
    async create(@Body() dto: CreateUserDto) {
        const user = await this.service.create(dto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Usuario creado correctamente',
            data: user,
        };
    }

    @Get()
    async findAll() {
        const users = await this.service.findAll();
        return {
            statusCode: HttpStatus.OK,
            message: 'Lista de usuarios obtenida correctamente',
            total: users.length,
            data: users,
        };
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID del usuario' })
    async findOne(@Param('id') id: number) {
        const user = await this.service.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Usuario con ID ${id} obtenido correctamente`,
            data: user,
        };
    }

    @Put(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID del usuario a actualizar' })
    @ApiBody({ type: UpdateUserDto })
    async update(@Param('id') id: number, @Body() dto: UpdateUserDto) {
        const updated = await this.service.update(id, dto);
        return {
            statusCode: HttpStatus.OK,
            message: `Usuario con ID ${id} actualizado correctamente`,
            data: updated,
        };
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: Number, description: 'ID del usuario a eliminar' })
    async remove(@Param('id') id: number) {
        await this.service.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Usuario con ID ${id} eliminado correctamente`,
        };
    }
}
