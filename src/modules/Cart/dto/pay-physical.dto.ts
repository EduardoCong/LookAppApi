import { ApiPropertyOptional } from '@nestjs/swagger';

export class PayPhysicalDto {
    @ApiPropertyOptional({
        example: 'Compra física en sucursal Centro',
        description: 'Nota opcional del cliente o vendedor'
    })
    note?: string;

    @ApiPropertyOptional({
        example: '9991234567',
        description: 'Teléfono opcional del cliente'
    })
    phone?: string;

    @ApiPropertyOptional({
        example: 'Juan Pérez',
        description: 'Nombre del cliente'
    })
    customerName?: string;
}
