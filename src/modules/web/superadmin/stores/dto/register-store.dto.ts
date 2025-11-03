import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class RegisterStoreDto {
    // ====== DATOS DE USUARIO ======
    @ApiProperty({ example: 'Carlos Ruiz' })
    @IsString()
    @IsNotEmpty()
    user_name: string;

    @ApiProperty({ example: 'carlos.ruiz@example.com' })
    @IsEmail()
    @IsNotEmpty()
    user_email: string;

    @ApiProperty({ example: 'MiClaveSegura2025' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: '9991234567' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: 'carlosruiz' })
    @IsString()
    @IsOptional()
    username?: string;

    @ApiProperty({ example: 'store', enum: ['superadmin', 'store', 'client'] })
    @IsString()
    @IsOptional()
    role?: string;

    // ====== DATOS DE TIENDA ======
    @ApiProperty({ example: 'Librería El Saber' })
    @IsString()
    @IsNotEmpty()
    business_name: string;

    @ApiProperty({ example: 'Carlos Ruiz' })
    @IsString()
    @IsOptional()
    owner_name?: string;

    @ApiProperty({ example: 'Calle 12 #200, Centro, Mérida, Yucatán' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'https://goo.gl/maps/libreriasaber' })
    @IsString()
    @IsOptional()
    map_url?: string;

    @ApiProperty({ example: '-89.6212' })
    @IsString()
    @IsOptional()
    longitude?: string;

    @ApiProperty({ example: '20.9720' })
    @IsString()
    @IsOptional()
    latitude?: string;

    @ApiProperty({
        example: 'Librería con amplia variedad de títulos académicos y literatura general.',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    category_id: number;

    // ====== STRIPE ======
    @ApiProperty({ example: 'premium', description: 'ID del plan en Stripe' })
    @IsString()
    @IsNotEmpty()
    plan_id: string;

    @ApiProperty({
        example: 'pm_1SPFDT9GTPj1Dxpud1WwvDdi',
        description: 'Payment method ID de Stripe',
    })
    @IsString()
    @IsNotEmpty()
    payment_method_id: string;
}
