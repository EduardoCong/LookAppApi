import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RegisterStoreDto {
    @ApiProperty({ example: 'Ferretería Don Pepe' })
    @IsString()
    @IsNotEmpty()
    business_name: string;

    @ApiProperty({ example: 'Don Pepe González' })
    @IsString()
    @IsOptional()
    owner_name?: string;

    @ApiProperty({ example: 'Av. Reforma #123, Mérida, Yucatán' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 1 })
    @IsNotEmpty()
    category_id: number;

    @ApiProperty({ example: 'Juan Pérez' })
    @IsString()
    @IsNotEmpty()
    user_name: string;

    @ApiProperty({ example: 'juan@example.com' })
    @IsEmail()
    @IsNotEmpty()
    user_email: string;

    @ApiProperty({ example: '12345678' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: 'basico', description: 'ID del plan en Stripe' })
    @IsString()
    @IsNotEmpty()
    plan_id: string;

    @ApiProperty({ example: 'pm_1SP54f9GTPj1DxpuGddKurkb', description: 'Payment method ID de Stripe' })
    @IsString()
    @IsNotEmpty()
    payment_method_id: string;
}
