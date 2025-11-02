import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';



export class CreateUserDto {
    @ApiProperty({
        example: 'Juan Pérez',
        description: 'Nombre completo del usuario.',
    })
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: 'juan@example.com',
        description: 'Correo electrónico único del usuario.',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: '123456',
        description: 'Contraseña del usuario (mínimo 6 caracteres).',
    })
    @MinLength(6)
    password: string;

    @ApiProperty({
        example: '9991234567',
        description: 'Teléfono del usuario (opcional).',
        required: false,
    })
    @IsOptional()
    phone?: string;

    @ApiProperty({
        example: 'juanperez',
        description: 'Nombre de usuario único (opcional).',
        required: false,
    })
    @IsOptional()
    username?: string;

    @ApiProperty({
        enum: UserRole,
        example: UserRole.CLIENT,
        description: 'Rol del usuario (superadmin, store o client).',
    })
    @IsEnum(UserRole)
    role: UserRole;
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }
