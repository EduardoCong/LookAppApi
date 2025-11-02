import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, IsEmail } from 'class-validator';

export class CreateStoreDetailDto {
    @ApiProperty({ example: 'Tienda especializada en herramientas.' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'ABC1234567X9' })
    @IsOptional()
    @IsString()
    rfc?: string;

    @ApiProperty({ example: '9991234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'contacto@ferretools.mx' })
    @IsOptional()
    @IsEmail()
    email_contact?: string;

    @ApiProperty({ example: 'https://cdn.lookapp.com/logos/ferretools.png' })
    @IsOptional()
    @IsString()
    logo_url?: string;

    @ApiProperty({ example: 'https://cdn.lookapp.com/covers/ferretools.jpg' })
    @IsOptional()
    @IsString()
    cover_image_url?: string;

    @ApiProperty({
        example: { monday: '9:00–18:00', sunday: 'Cerrado' },
        description: 'Horario de apertura por día de la semana.',
    })
    @IsOptional()
    @IsObject()
    opening_hours?: Record<string, string>;

    @ApiProperty({ example: 'Frente a la plaza principal' })
    @IsOptional()
    @IsString()
    reference?: string;

    @ApiProperty({ example: 'WhatsApp' })
    @IsOptional()
    @IsString()
    contact_method?: string;

    @ApiProperty({
        example: { facebook: 'fb.com/ferretools', instagram: '@ferretools' },
    })
    @IsOptional()
    @IsObject()
    social_links?: Record<string, string>;
}

export class UpdateStoreDetailDto extends PartialType(CreateStoreDetailDto) { }
