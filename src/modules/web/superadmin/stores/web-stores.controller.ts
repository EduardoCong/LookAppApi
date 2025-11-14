import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { WebStoresService } from './web-stores.service';
import { RegisterStoreDto } from './dto/register-store.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { AdminStoresService } from 'src/modules/web-admin/stores/admin-stores.service';
import { StoresService } from 'src/modules/stores/stores.service';

@ApiTags('WEB / SuperAdmin')
@Controller('web/superadmin')
export class WebStoresController {
    constructor(private readonly service: WebStoresService, private readonly adminstoreservice: AdminStoresService, private readonly storeservice: StoresService) { }


    @Get('admin/stats')
    @ApiOperation({
        summary: 'Obtener estadísticas generales del sistema',
        description: `Devuelve un resumen general del sistema para el panel de SuperAdmin, 
    incluyendo métricas de tiendas registradas, usuarios, productos y suscripciones.`,
    })
    async getStats() {
        return await this.service.getAdminStats();
    }

    @Get('pending')
    @ApiOperation({
        summary: 'Listar tiendas pendientes de aprobación',
        description: `Obtiene todas las tiendas que aún no han sido aprobadas ni rechazadas. 
    Ideal para el panel del SuperAdmin donde se revisan las solicitudes recientes.`,
    })
    async getPending() {
        const data = await this.adminstoreservice.findPending();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas pendientes obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Get('approved')
    @ApiOperation({
        summary: 'Listar tiendas aprobadas',
        description: `Devuelve todas las tiendas que fueron aprobadas por el equipo de administración 
    y que actualmente se encuentran activas en la plataforma.`,
    })
    async getApproved() {
        const data = await this.adminstoreservice.findApproved();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas aprobadas obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Get('rejected')
    @ApiOperation({
        summary: 'Listar tiendas rechazadas',
        description: `Obtiene el listado de tiendas que fueron rechazadas por incumplir políticas 
    o no completar correctamente su proceso de registro.`,
    })
    async getRejected() {
        const data = await this.adminstoreservice.findRejected();
        return {
            statusCode: HttpStatus.OK,
            message: 'Listado de tiendas rechazadas obtenido correctamente',
            total: data.length,
            data,
        };
    }

    @Patch(':id/approve')
    @ApiOperation({
        summary: 'Aprobar tienda pendiente',
        description: `Cambia el estado de una tienda a **aprobada**, 
  marcándola como verificada y activa dentro del sistema.  
  Además, se registra una entrada en el historial administrativo con la acción 'APPROVED'.`,
    })
    async approve(@Param('id', ParseIntPipe) id: number) {
        const result = await this.adminstoreservice.approve(id, 7);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            data: result.store,
        };
    }

    @Patch(':id/reject')
    @ApiOperation({
        summary: 'Rechazar tienda pendiente',
        description: `Cambia el estado de una tienda a **rechazada** y registra un comentario opcional 
  que indique la razón del rechazo.  
  Se guarda también un registro administrativo con la acción 'REJECTED'.`,
    })
    async reject(
        @Param('id', ParseIntPipe) id: number,
        @Body('comment') comment: string,
    ) {
        const result = await this.adminstoreservice.reject(id, 7, comment);
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            data: result.store,
        };
    }

    @Get('store/:id')
    @ApiOperation({
        summary: 'Obtener una tienda por ID',
        description: `Devuelve la información detallada de una tienda específica, 
  incluyendo sus datos principales, estado y relaciones (como categoría o propietario).  
  Este endpoint está pensado para consultas administrativas o de gestión.`,
    })
    @ApiParam({ name: 'id', type: Number, description: 'ID de la tienda' })
    async findOne(@Param('id') id: number) {
        const store = await this.storeservice.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: `Tienda con ID ${id} obtenida correctamente`,
            data: store,
        };
    }

    @Get('store/:id/stats')
    async getStoreStats(@Param('id') id: number) {
        return this.service.getStoreStats(id);
    }
}
