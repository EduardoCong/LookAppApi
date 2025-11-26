import { ApiPropertyOptional } from '@nestjs/swagger';

export class PayPhysicalStoreDto {
    @ApiPropertyOptional({
        example: 'Apartado generado en tienda',
        description: 'Nota opcional'
    })
    note?: string;

    @ApiPropertyOptional({
        example: '9992345671',
        description: 'Teléfono opcional'
    })
    phone?: string;

    @ApiPropertyOptional({
        example: 'Cliente de mostrador',
        description: 'Nombre del cliente'
    })
    customerName?: string;
}
